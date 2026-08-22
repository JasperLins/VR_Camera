/**
 * 职责:积分服务——六类获取入账(幂等只插入)/商店下载单向抵扣(年上限)/余额与流水查询
 * 关联需求:FR-05/FR-08;关联任务:PKG-18(P-3/T12);与 Token 账本同构但独立账户体系
 * 口径:积分不可购 3D 生成(D-009);仅商店下载按 10:1 抵扣;年上限 200 Token 等值(D-045)
 * 事务安全:幂等复核一律事务外预查/补查(PG 事务内语句失败即中止,同 TokenService 口径)
 */
import { Injectable } from '@nestjs/common';
import { Prisma, PointsLedgerEntry, PointsReason } from '@vrm/database';
import { AppErrorCode, PageResult } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertRedeemableByRate, assertValidPointsAmount, startOfYear, yearlyRedeemRemaining } from './points.logic';

type Tx = Prisma.TransactionClient;

export interface PointsMutationResult {
  created: boolean;
  balanceAfter: number;
  entryId: string;
}

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const account = await this.prisma.pointsAccount.findUnique({ where: { userId } });
    return account?.balance ?? 0;
  }

  async listEntries(userId: string, page: number, pageSize: number): Promise<PageResult<PointsLedgerEntry>> {
    const account = await this.prisma.pointsAccount.findUnique({ where: { userId } });
    if (!account) {
      return { items: [], total: 0, page, pageSize };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pointsLedgerEntry.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.pointsLedgerEntry.count({ where: { accountId: account.id } })
    ]);
    return { items, total, page, pageSize };
  }

  /** 入账(打卡/上传/被下载/评论/点赞/购买):幂等键唯一,同参重放返回既有结果 */
  async credit(
    userId: string,
    amount: number,
    reason: PointsReason,
    idempotencyKey: string,
    refId?: string,
    tx?: Tx
  ): Promise<PointsMutationResult> {
    assertValidPointsAmount(amount);
    const replay = await this.matchReplay(userId, amount, reason, idempotencyKey);
    if (replay) {
      return replay;
    }

    const flow = async (client: Tx): Promise<PointsMutationResult> => {
      const accountId = await this.resolveAccountId(client, userId);
      const entry = await client.pointsLedgerEntry.create({
        data: { accountId, delta: amount, reason, idempotencyKey, refId }
      });
      const account = await client.pointsAccount.update({
        where: { id: accountId },
        data: { balance: { increment: amount } }
      });
      return { created: true, balanceAfter: account.balance, entryId: entry.id };
    };
    return this.runGuarded(flow, userId, amount, reason, idempotencyKey, tx);
  }

  /**
   * 商店下载抵扣(唯一支出场景,Q-3 接线):原子扣 + 年上限校验(D-045)+ 10:1 粒度校验
   * 年度支出 = 当年 STORE_REDEEM 流水合计(只插入账本,聚合即事实)
   */
  async redeemForStoreDownload(
    userId: string,
    points: number,
    idempotencyKey: string,
    refId: string
  ): Promise<PointsMutationResult> {
    assertRedeemableByRate(points);
    const replay = await this.matchReplay(userId, -points, PointsReason.STORE_REDEEM, idempotencyKey);
    if (replay) {
      return replay;
    }

    const yearStart = startOfYear(new Date());
    const account = await this.prisma.pointsAccount.findUnique({ where: { userId } });
    if (account) {
      const spent = await this.prisma.pointsLedgerEntry.aggregate({
        where: { accountId: account.id, reason: PointsReason.STORE_REDEEM, createdAt: { gte: yearStart } },
        _sum: { delta: true }
      });
      const remaining = yearlyRedeemRemaining(Math.abs(spent._sum.delta ?? 0));
      if (points > remaining) {
        throw BizException.of(AppErrorCode.STATE_CONFLICT, `超出年度抵扣上限(剩余 ${remaining} 积分额度,D-045)`);
      }
    }

    const flow = async (client: Tx): Promise<PointsMutationResult> => {
      const accountId = await this.resolveAccountId(client, userId);
      const updated = await client.pointsAccount.updateMany({
        where: { userId, balance: { gte: points } },
        data: { balance: { decrement: points } }
      });
      if (updated.count === 0) {
        throw BizException.of(AppErrorCode.STATE_CONFLICT, '积分余额不足(下载可通过每日打卡获取)');
      }
      const entry = await client.pointsLedgerEntry.create({
        data: { accountId, delta: -points, reason: PointsReason.STORE_REDEEM, idempotencyKey, refId }
      });
      const acc = await client.pointsAccount.findUnique({ where: { userId } });
      return { created: true, balanceAfter: acc?.balance ?? 0, entryId: entry.id };
    };
    return this.runGuarded(flow, userId, -points, PointsReason.STORE_REDEEM, idempotencyKey);
  }

  // ---- 内部:幂等匹配与事务编排(与 TokenService 同构) ----

  private async matchReplay(
    userId: string,
    delta: number,
    reason: PointsReason,
    idempotencyKey: string
  ): Promise<PointsMutationResult | null> {
    const existing = await this.prisma.pointsLedgerEntry.findUnique({ where: { idempotencyKey } });
    if (!existing) {
      return null;
    }
    if (existing.delta !== delta || existing.reason !== reason) {
      throw BizException.of(AppErrorCode.DUPLICATED_IDEMPOTENCY, '积分幂等键冲突(异参重放)');
    }
    const account = await this.prisma.pointsAccount.findUnique({ where: { userId } });
    return { created: false, balanceAfter: account?.balance ?? 0, entryId: existing.id };
  }

  private async runGuarded(
    flow: (client: Tx) => Promise<PointsMutationResult>,
    userId: string,
    delta: number,
    reason: PointsReason,
    idempotencyKey: string,
    tx?: Tx
  ): Promise<PointsMutationResult> {
    if (tx) {
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
    const existing = await tx.pointsAccount.findUnique({ where: { userId } });
    if (existing) {
      return existing.id;
    }
    const created = await tx.pointsAccount.create({ data: { userId } });
    return created.id;
  }
}
