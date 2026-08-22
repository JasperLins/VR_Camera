/**
 * 职责:worker 侧 Token 入账(退款专用)——SQL 级幂等(ON CONFLICT DO NOTHING),语义对齐 api TokenService.credit
 * 关联任务:PKG-14(T8);只做 credit(worker 永不扣款),同 key 重放不重复加余额
 * 说明:api 侧 TokenService 是 Nest 注入版;worker 进程无 Nest 容器,用等价 SQL 表达
 *       「流水只插入 + 唯一键防重 + 余额变更仅随新流水」三不变式。
 */
import { Prisma } from '@vrm/database';
import type { PrismaClient } from '@vrm/database';
import type { WorkerTokenService } from './worker-types';

export function createWorkerTokenService(prisma: PrismaClient): WorkerTokenService {
  return {
    async credit(userId, amount, reason, idempotencyKey, refId) {
      return prisma.$transaction(async (tx) => {
        // 1. 账户兜底建(user 无账户时首笔入账前建,幂等)
        await tx.$executeRaw`
          INSERT INTO token_accounts (id, user_id, balance)
          VALUES (gen_random_uuid(), ${userId}, 0)
          ON CONFLICT (user_id) DO NOTHING
        `;

        // 2. 流水插入:同 key 重放 → 0 行,不加余额
        const inserted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          INSERT INTO token_ledger (id, account_id, delta, reason, idempotency_key, ref_id)
          SELECT gen_random_uuid(), a.id, ${amount}, ${reason}::"LedgerReason", ${idempotencyKey}, ${refId ?? null}
          FROM token_accounts a WHERE a.user_id = ${userId}
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id
        `);

        // 3. 余额只随新流水变动(重放命中既有 key 时仅回读余额)
        const [account] =
          inserted.length > 0
            ? await tx.$queryRaw<Array<{ balance: number }>>(Prisma.sql`
                UPDATE token_accounts SET balance = balance + ${amount}, updated_at = now()
                WHERE user_id = ${userId}
                RETURNING balance
              `)
            : await tx.$queryRaw<Array<{ balance: number }>>(Prisma.sql`
                SELECT balance FROM token_accounts WHERE user_id = ${userId}
              `);

        return {
          created: inserted.length > 0,
          balanceAfter: account?.balance ?? 0,
          entryId: inserted[0]?.id ?? 'replayed'
        };
      });
    }
  };
}
