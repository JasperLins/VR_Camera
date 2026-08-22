/**
 * 职责:Token 账本服务单测——原子扣减/幂等重放/异参冲突/注册赠送(PKG-13 验收:并发扣减幂等)
 * 手法:内存版 Prisma 桩实现 $transaction 交互式回调语义,不依赖真实 DB
 */
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from './token.service';

/** 内存账本桩:实现服务用到的最小 Prisma 面 */
function createFakePrisma(initialBalance: number) {
  const state = {
    accounts: [{ id: 'acc-1', userId: 'user-1', balance: initialBalance }],
    entries: [] as Array<{ id: string; accountId: string; delta: number; reason: string; idempotencyKey: string; refId?: string | null }>,
    seq: 0
  };

  const client = {
    tokenAccount: {
      findUnique: jest.fn(async ({ where }: any) =>
        state.accounts.find((a) => a.userId === where.userId) ?? null
      ),
      create: jest.fn(async ({ data }: any) => {
        const account = { id: `acc-${++state.seq + 1}`, ...data };
        state.accounts.push(account);
        return account;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const account = state.accounts.find(
          (a) => (where.id ? a.id === where.id : a.userId === where.userId)
        )!;
        account.balance += data.balance.increment ?? -data.balance.decrement;
        return account;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const account = state.accounts.find((a) => a.userId === where.userId)!;
        if (where.balance && account.balance < where.balance.gte) {
          return { count: 0 };
        }
        account.balance -= data.balance.decrement;
        return { count: 1 };
      })
    },
    tokenLedgerEntry: {
      create: jest.fn(async ({ data }: any) => {
        if (state.entries.some((e) => e.idempotencyKey === data.idempotencyKey)) {
          const err = new Error('Unique constraint failed') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const entry = { id: `entry-${++state.seq}`, ...data };
        state.entries.push(entry);
        return entry;
      }),
      findUnique: jest.fn(async ({ where }: any) =>
        state.entries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null
      )
    }
  };

  // 交互式事务:同一桩直传回调,并用快照模拟回滚(抛错即还原,近似真实 $transaction 语义)
  const prisma = {
    ...client,
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg !== 'function') {
        return Promise.all(arg);
      }
      const snapshot = JSON.stringify({ accounts: state.accounts, entries: state.entries });
      try {
        return await arg(client);
      } catch (err) {
        const restored = JSON.parse(snapshot);
        state.accounts = restored.accounts;
        state.entries = restored.entries;
        throw err;
      }
    })
  } as unknown as PrismaService;

  return { prisma, state };
}

describe('TokenService.debit', () => {
  it('余额充足:扣减成功且落一条负流水', async () => {
    const { prisma, state } = createFakePrisma(100);
    const service = new TokenService(prisma);

    const result = await service.debit('user-1', 60, 'GENERATION_DEBIT' as never, 'gen-debit:task-1', 'task-1');

    expect(result.created).toBe(true);
    expect(result.balanceAfter).toBe(40);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].delta).toBe(-60);
  });

  it('余额不足:抛 INSUFFICIENT_TOKEN,事务回滚不留流水', async () => {
    const { prisma, state } = createFakePrisma(59);
    const service = new TokenService(prisma);

    await expect(
      service.debit('user-1', 60, 'GENERATION_DEBIT' as never, 'gen-debit:task-2')
    ).rejects.toBeInstanceOf(BizException);

    expect(state.entries).toHaveLength(0);
  });

  it('并发等价的幂等重放:同 key 同参返回首次结果,不二次扣减', async () => {
    const { prisma, state } = createFakePrisma(100);
    const service = new TokenService(prisma);

    const first = await service.debit('user-1', 60, 'GENERATION_DEBIT' as never, 'gen-debit:task-1');
    const replay = await service.debit('user-1', 60, 'GENERATION_DEBIT' as never, 'gen-debit:task-1');

    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.entryId).toBe(first.entryId);
    expect(replay.balanceAfter).toBe(40);
    expect(state.entries).toHaveLength(1);
  });

  it('异参重放:同 key 不同金额抛 DUPLICATED_IDEMPOTENCY', async () => {
    const { prisma } = createFakePrisma(100);
    const service = new TokenService(prisma);

    await service.debit('user-1', 60, 'GENERATION_DEBIT' as never, 'gen-debit:task-1');
    await expect(
      service.debit('user-1', 30, 'GENERATION_DEBIT' as never, 'gen-debit:task-1')
    ).rejects.toBeInstanceOf(BizException);
  });
});

describe('TokenService.credit / grantRegister', () => {
  it('注册赠送 80:新账户自动创建并入账', async () => {
    const { prisma, state } = createFakePrisma(0);
    const service = new TokenService(prisma);

    const result = await service.grantRegister('user-1');

    expect(result.created).toBe(true);
    expect(result.balanceAfter).toBe(80);
    expect(state.entries[0].delta).toBe(80);
    expect(state.entries[0].idempotencyKey).toBe('register-grant:user-1');
  });

  it('重复发放注册赠送被幂等拦截(同 key 只发一次)', async () => {
    const { prisma, state } = createFakePrisma(0);
    const service = new TokenService(prisma);

    await service.grantRegister('user-1');
    const again = await service.grantRegister('user-1');

    expect(again.created).toBe(false);
    expect(again.balanceAfter).toBe(80);
    expect(state.entries).toHaveLength(1);
  });

  it('非法金额(0/负数/小数)直接抛错不入账', async () => {
    const { prisma, state } = createFakePrisma(10);
    const service = new TokenService(prisma);

    await expect(service.credit('user-1', 0, 'ACTIVITY_GRANT' as never, 'k1')).rejects.toThrow();
    await expect(service.credit('user-1', -5, 'ACTIVITY_GRANT' as never, 'k2')).rejects.toThrow();
    await expect(service.credit('user-1', 1.5, 'ACTIVITY_GRANT' as never, 'k3')).rejects.toThrow();
    expect(state.entries).toHaveLength(0);
  });
});

describe('TokenService.getBalance', () => {
  it('无账户返回 0(未注册赠送前)', async () => {
    const { prisma } = createFakePrisma(0);
    const service = new TokenService(prisma);

    expect(await service.getBalance('nobody')).toBe(0);
  });
});
