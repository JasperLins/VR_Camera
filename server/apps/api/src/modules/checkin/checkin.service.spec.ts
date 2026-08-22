/**
 * 职责:打卡服务单测——+2/同锚点每日首次(幂等)/日上限 10/新号冷却(PKG-18 S-1 验收)
 * 手法:内存 Prisma 桩(账本快照回滚语义)+ 真 PointsService 跑账本三不变式
 */
import { CheckinService } from './checkin.service';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../../common/prisma/prisma.service';

function createFakePrisma(opts: { accountAgeHours?: number } = {}) {
  const ageHours = opts.accountAgeHours ?? 48;
  const state = {
    users: [{ id: 'user-1', createdAt: new Date(Date.now() - ageHours * 3_600_000) }],
    anchors: [{ id: 'anchor-1', status: 'VISIBLE' }], // a-N 由 findUnique 桩动态生成
    accounts: [] as Array<{ id: string; userId: string; balance: number }>,
    entries: [] as Array<{ id: string; accountId: string; delta: number; reason: string; idempotencyKey: string; refId?: string | null; createdAt: Date }>,
    seq: 0
  };

  const client = {
    user: {
      findUniqueOrThrow: jest.fn(async ({ where }: any) => state.users.find((u) => u.id === where.id)!)
    },
    anchor: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (/^a-\d+$/.test(where.id)) return { id: where.id, status: 'VISIBLE' };
        return state.anchors.find((a) => a.id === where.id) ?? null;
      })
    },
    pointsAccount: {
      findUnique: jest.fn(async ({ where }: any) => state.accounts.find((a) => a.userId === where.userId) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const account = { id: `pacc-${++state.seq}`, ...data };
        state.accounts.push(account);
        return account;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const account = state.accounts.find((a) => (where.id ? a.id === where.id : a.userId === where.userId))!;
        account.balance += data.balance.increment ?? -data.balance.decrement;
        return account;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const account = state.accounts.find((a) => a.userId === where.userId)!;
        if (where.balance && account.balance < where.balance.gte) return { count: 0 };
        account.balance -= data.balance.decrement;
        return { count: 1 };
      })
    },
    pointsLedgerEntry: {
      create: jest.fn(async ({ data }: any) => {
        if (state.entries.some((e) => e.idempotencyKey === data.idempotencyKey)) {
          const err = new Error('dup') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const entry = { id: `pe-${++state.seq}`, createdAt: new Date(), ...data };
        state.entries.push(entry);
        return entry;
      }),
      findUnique: jest.fn(async ({ where }: any) =>
        state.entries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null
      ),
      aggregate: jest.fn(async ({ where }: any) => {
        const mine = state.entries.filter(
          (e) =>
            e.accountId === where.accountId &&
            e.reason === where.reason &&
            (!where.createdAt?.gte || e.createdAt >= where.createdAt.gte)
        );
        return { _sum: { delta: mine.reduce((sum, e) => sum + e.delta, 0) } };
      })
    }
  };

  const prisma = {
    ...client,
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg !== 'function') return Promise.all(arg);
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

function createService(prisma: PrismaService) {
  return new CheckinService(prisma, new PointsService(prisma));
}

describe('CheckinService.checkin', () => {
  it('有效打卡 +2,同锚点同日重复打卡幂等(不再入账)', async () => {
    const { prisma, state } = createFakePrisma();
    const service = createService(prisma);

    const first = await service.checkin('user-1', 'anchor-1');
    expect(first.pointsEarned).toBe(2);
    expect(first.todayEarned).toBe(2);

    const second = await service.checkin('user-1', 'anchor-1');
    expect(second.pointsEarned).toBe(0);
    expect(second.replayed).toBe(true);
    expect(second.todayEarned).toBe(2);
    expect(state.entries.filter((e) => e.reason === 'CHECKIN')).toHaveLength(1);
  });

  it('日上限 10:第 5 次不同锚点打卡后达上限,第 6 次拒绝', async () => {
    const { prisma } = createFakePrisma();
    const service = createService(prisma);

    for (let i = 1; i <= 5; i += 1) {
      const result = await service.checkin('user-1', `a-${i}`);
      expect(result.todayEarned).toBe(2 * i);
    }

    (prisma.anchor.findUnique as jest.Mock).mockImplementationOnce(async () => ({ id: 'a-6', status: 'VISIBLE' }));
    await expect(service.checkin('user-1', 'a-6')).rejects.toMatchObject({ bizCode: 40904 });
  });

  it('新号冷却:1 小时内账号拒绝打卡', async () => {
    const { prisma } = createFakePrisma({ accountAgeHours: 0.5 });
    const service = createService(prisma);
    await expect(service.checkin('user-1', 'anchor-1')).rejects.toMatchObject({ bizCode: 40904 });
  });

  it('锚点不存在/不可见拒绝', async () => {
    const { prisma } = createFakePrisma();
    const service = createService(prisma);
    await expect(service.checkin('user-1', 'missing')).rejects.toMatchObject({ bizCode: 40401 });
  });
});
