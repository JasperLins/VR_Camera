/**
 * 职责:Token 账本服务——注册赠送/原子扣减/退款/余额与流水查询(A-405:权威余额仅服务端)
 * 关联需求:FR-07;关联任务:PKG-13(P-1)+ PKG-14(tx 透传)
 * 实现要点:
 *  - 扣减原子性:updateMany 带 balance >= amount 条件(单条 UPDATE 自带行锁,天然原子);
 *  - 幂等:流水表 idempotency_key 唯一索引,同参重放返回既有结果,异参重放报 DUPLICATED_IDEMPOTENCY;
 *  - 流水只插入不更新(tech-stack §7.2);余额变更与流水同事务;
 *  - 事务安全口径:PG 事务内语句失败即中止(25P02),故幂等冲突的复核一律在事务外预查/补查,
 *    绝不在中止事务内继续查询(2026-08-23 打卡幂等链路实测踩坑)。
 */
import { Injectable } from '@nestjs/common';
import { Prisma, LedgerReason, TokenLedgerEntry } from '@vrm/database';
import { AppErrorCode, PageResult } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertValidAmount, buildIdempotencyKey, IdempotencyKind, registerGrantAmount } from './ledger.logic';

export interface LedgerMutationResult {
  /** 本次是否为新入账(false = 幂等重放命中既有流水) */
  created: boolean;
  balanceAfter: number;
  entryId: string;
}

/** 事务客户端类型别名(交互式 $transaction 回调入参) */
type Tx = Prisma.TransactionClient;

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** 查余额;账户不存在视为 0(未注册赠送前) */
  async getBalance(userId: string): Promise<number> {
    const account = await this.prisma.tokenAccount.findUnique({ where: { userId } });
    return account?.balance ?? 0;
  }

  /** 流水明细分页(时间倒序) */
  async listEntries(userId: string, page: number, pageSize: number): Promise<PageResult<TokenLedgerEntry>> {
    const account = await this.prisma.tokenAccount.findUnique({ where: { userId } });
    if (!account) {
      return { items: [], total: 0, page, pageSize };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tokenLedgerEntry.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.tokenLedgerEntry.count({ where: { accountId: account.id } })
    ]);

    return { items, total, page, pageSize };
  }

  /** 注册赠送 80(D-049):幂等键 register-grant:userId,重复调用安全 */
  async grantRegister(userId: string): Promise<LedgerMutationResult> {
    return this.credit(
      userId,
      registerGrantAmount(),
      LedgerReason.REGISTER_GRANT,
      buildIdempotencyKey(IdempotencyKind.REGISTER_GRANT, userId)
    );
  }

  /** 入账(赠送/退款/人工调整):金额>0,余额只增;账户不存在则先建;tx 透传则并入调用方事务 */
  async credit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    idempotencyKey: string,
    refId?: string,
    tx?: Tx
  ): Promise<LedgerMutationResult> {
    assertValidAmount(amount);
    const replay = await this.matchReplay(userId, amount, reason, idempotencyKey);
    if (replay) {
      return replay;
    }

    const flow = async (client: Tx): Promise<LedgerMutationResult> => {
      const accountId = await this.resolveAccountId(client, userId);
      const entry = await client.tokenLedgerEntry.create({
        data: { accountId, delta: amount, reason, idempotencyKey, refId }
      });
      const account = await client.tokenAccount.update({
        where: { id: accountId },
        data: { balance: { increment: amount } }
      });
      return { created: true, balanceAfter: account.balance, entryId: entry.id };
    };
    return this.runGuarded(flow, userId, amount, reason, idempotencyKey, tx);
  }

  /**
   * 原子扣减(生成消费等):余额不足抛 INSUFFICIENT_TOKEN(D-029 红线:引导赠送途径,无充值入口)
   * 幂等:同 key 重放返回首次结果;异参重放(key 复用但金额/原因不同)抛 DUPLICATED_IDEMPOTENCY
   */
  async debit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    idempotencyKey: string,
    refId?: string,
    tx?: Tx
  ): Promise<LedgerMutationResult> {
    assertValidAmount(amount);
    const replay = await this.matchReplay(userId, -amount, reason, idempotencyKey);
    if (replay) {
      return replay;
    }

    const flow = async (client: Tx): Promise<LedgerMutationResult> => {
      const accountId = await this.resolveAccountId(client, userId);
      // 原子扣减:条件 UPDATE,0 行命中即余额不足(整个事务回滚,流水不留痕)
      const updated = await client.tokenAccount.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
      });
      if (updated.count === 0) {
        throw BizException.of(AppErrorCode.INSUFFICIENT_TOKEN, 'Token 余额不足(可通过活动获得赠送)');
      }
      const entry = await client.tokenLedgerEntry.create({
        data: { accountId, delta: -amount, reason, idempotencyKey, refId }
      });
      const account = await client.tokenAccount.findUnique({ where: { userId } });
      return { created: true, balanceAfter: account?.balance ?? 0, entryId: entry.id };
    };
    return this.runGuarded(flow, userId, -amount, reason, idempotencyKey, tx);
  }

  // ---- 内部:幂等匹配与事务编排 ----

  /** 事务外预查:同参命中 → 重放结果;异参命中 → DUPLICATED_IDEMPOTENCY;未命中 → null */
  private async matchReplay(
    userId: string,
    delta: number,
    reason: LedgerReason,
    idempotencyKey: string
  ): Promise<LedgerMutationResult | null> {
    const existing = await this.prisma.tokenLedgerEntry.findUnique({ where: { idempotencyKey } });
    if (!existing) {
      return null;
    }
    if (existing.delta !== delta || existing.reason !== reason) {
      throw BizException.of(
        AppErrorCode.DUPLICATED_IDEMPOTENCY,
        '幂等键已被不同参数的请求使用(idempotency key 冲突)'
      );
    }
    return this.replayResult(userId, existing);
  }

  /** 事务执行 + 并发冲突兜底(P2002 → 事务已回滚,事务外复核同参重放) */
  private async runGuarded(
    flow: (client: Tx) => Promise<LedgerMutationResult>,
    userId: string,
    delta: number,
    reason: LedgerReason,
    idempotencyKey: string,
    tx?: Tx
  ): Promise<LedgerMutationResult> {
    if (tx) {
      // 调用方事务:键应为新生成(如 gen-debit:新 taskId),冲突概率可忽略;P2002 直接上抛
      return flow(tx);
    }
    try {
      return await this.prisma.$transaction(flow);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        const replay = await this.matchReplay(userId, delta, reason, idempotencyKey);
        if (replay) {
          return replay;
        }
      }
      throw err;
    }
  }

  private async resolveAccountId(tx: Tx, userId: string): Promise<string> {
    const existing = await tx.tokenAccount.findUnique({ where: { userId } });
    if (existing) {
      return existing.id;
    }
    const created = await tx.tokenAccount.create({ data: { userId } });
    return created.id;
  }

  private async replayResult(userId: string, entry: TokenLedgerEntry): Promise<LedgerMutationResult> {
    const account = await this.prisma.tokenAccount.findUnique({ where: { userId } });
    return { created: false, balanceAfter: account?.balance ?? 0, entryId: entry.id };
  }
}
