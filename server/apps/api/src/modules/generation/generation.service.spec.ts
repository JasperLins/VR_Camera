/**
 * 职责:生成网关服务单测——同事务扣款建任务/余额不足回滚/取消比例退款/非法迁移拒绝(T7/T9 验收)
 * 手法:内存 Prisma 桩(账本快照回滚语义,同 token.service.spec)+ 桩队列(记录入队)
 */
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../ledger/token.service';
import { GenerationService } from './generation.service';

const TAGS = { style: '写实', material: '哑光', texture: '4K', addons: ['PBR'] } as const;

function createFakePrisma(initialBalance: number, initialTask?: { id: string; status: string; progress: number }) {
  const state = {
    accounts: [{ id: 'acc-1', userId: 'user-1', balance: initialBalance }],
    entries: [] as Array<{ id: string; accountId: string; delta: number; reason: string; idempotencyKey: string; refId?: string | null }>,
    tasks: initialTask
      ? [{ userId: 'user-1', refundToken: 0, ...initialTask }]
      : [] as Array<{ id: string; userId: string; status: string; progress: number; refundToken: number }>,
    seq: 0
  };

  const client = {
    tokenAccount: {
      findUnique: jest.fn(async ({ where }: any) => state.accounts.find((a) => a.userId === where.userId) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const account = { id: `acc-${++state.seq + 1}`, ...data };
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
      findUnique: jest.fn(async ({ where }: any) => state.entries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null)
    },
    genTask: {
      findUnique: jest.fn(async ({ where }: any) => state.tasks.find((t) => t.id === where.id) ?? null),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => {
        const task = state.tasks.find((t) => t.id === where.id);
        if (!task) throw new Error('not found');
        return task;
      }),
      create: jest.fn(async ({ data }: any) => {
        const task = { refundToken: 0, progress: 0, ...data };
        state.tasks.push(task);
        return task;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const task = state.tasks.find((t) => t.id === where.id && t.status === where.status);
        if (!task) return { count: 0 };
        Object.assign(task, data);
        return { count: 1 };
      })
    }
  };

  const prisma = {
    ...client,
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg !== 'function') return Promise.all(arg);
      const snapshot = JSON.stringify({ accounts: state.accounts, entries: state.entries, tasks: state.tasks });
      try {
        return await arg(client);
      } catch (err) {
        const restored = JSON.parse(snapshot);
        state.accounts = restored.accounts;
        state.entries = restored.entries;
        state.tasks = restored.tasks;
        throw err;
      }
    })
  } as unknown as PrismaService;

  return { prisma, state };
}

function createService(prisma: PrismaService) {
  const queue = { add: jest.fn(async () => ({})) };
  const service = new GenerationService(prisma, new TokenService(prisma), queue as never);
  return { service, queue };
}

describe('GenerationService.create', () => {
  it('扣 60 与建任务同事务落库,入队带 taskId', async () => {
    const { prisma, state } = createFakePrisma(80);
    const { service, queue } = createService(prisma);

    const result = await service.create('user-1', { tags: TAGS as never });

    expect(result.balanceAfter).toBe(20);
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].status).toBe('DEDUCTED');
    expect(state.entries.at(-1)?.delta).toBe(-60);
    expect(queue.add).toHaveBeenCalledWith('generate', expect.objectContaining({ taskId: state.tasks[0].id }), expect.anything());
  });

  it('余额不足:抛 INSUFFICIENT_TOKEN 且任务不留痕(事务回滚)', async () => {
    const { prisma, state } = createFakePrisma(59);
    const { service } = createService(prisma);

    await expect(service.create('user-1', { tags: TAGS as never })).rejects.toMatchObject({ bizCode: 40901 });
    expect(state.tasks).toHaveLength(0);
    expect(state.entries).toHaveLength(0);
  });

  it('非法标签被拒(INVALID_PARAM,不扣款)', async () => {
    const { prisma, state } = createFakePrisma(80);
    const { service } = createService(prisma);

    await expect(
      service.create('user-1', { tags: { style: '赛博朋克', material: '哑光', texture: '4K', addons: [] } as never })
    ).rejects.toMatchObject({ bizCode: 40000 });
    expect(state.entries).toHaveLength(0);
  });
});

describe('GenerationService.getTask', () => {
  it('他人任务按 404 口径(防枚举)', async () => {
    const { prisma } = createFakePrisma(80, { id: 'task-1', status: 'GENERATING', progress: 30 });
    const { service } = createService(prisma);

    await expect(service.getTask('user-other', 'task-1')).rejects.toMatchObject({ bizCode: 40402 });
    await expect(service.getTask('user-1', 'task-1')).resolves.toBeTruthy();
  });
});

describe('GenerationService.cancel', () => {
  it('GENERATING 进度 80%:退 20%(12 Token)且状态落 CANCELLED', async () => {
    const { prisma, state } = createFakePrisma(20, { id: 'task-1', status: 'GENERATING', progress: 30 }); // 已扣 60
    state.tasks[0].progress = 80;
    const { service } = createService(prisma);

    const result = await service.cancel('user-1', 'task-1');

    expect(result.refundToken).toBe(12);
    expect(state.tasks[0].status).toBe('CANCELLED');
    expect(state.accounts[0].balance).toBe(32);
    expect(state.entries.at(-1)?.delta).toBe(12);
    expect(state.entries.at(-1)?.reason).toBe('GENERATION_REFUND_PARTIAL');
  });

  it('进度 0%:全额退 60', async () => {
    const { prisma, state } = createFakePrisma(20, { id: 'task-1', status: 'GENERATING', progress: 0 });
    const { service } = createService(prisma);

    const result = await service.cancel('user-1', 'task-1');
    expect(result.refundToken).toBe(60);
    expect(state.accounts[0].balance).toBe(80);
  });

  it('终态任务拒绝取消(ILLEGAL_TASK_TRANSITION)', async () => {
    const { prisma } = createFakePrisma(20, { id: 'task-1', status: 'COMPLETED', progress: 100 });
    const { service } = createService(prisma);

    await expect(service.cancel('user-1', 'task-1')).rejects.toBeInstanceOf(BizException);
  });

  it('DEDUCTED 态不可取消(仅 GENERATING)', async () => {
    const { prisma } = createFakePrisma(20, { id: 'task-1', status: 'DEDUCTED', progress: 0 });
    const { service } = createService(prisma);

    await expect(service.cancel('user-1', 'task-1')).rejects.toMatchObject({ bizCode: 40903 });
  });
});
