/**
 * 职责:生成处理器集成单测——mock 全链路(受理→进度→完成 / 失败全额退 / 提交失败退 / 用户取消让路)
 * 关联任务:PKG-14(T8 验收线);桩:内存 genTask 表 + 脚本化 provider + 记录式 publish/sleep(零等待)
 */
import { processGenerationJob, sweepStuckSubmitted, TaskProgressEvent } from './generation-processor';
import type { GenerationProcessorDeps } from './generation-processor';
import type { WorkerGenTask } from './worker-types';

/** 内存任务表桩(条件 updateMany 语义:where.status 匹配才更新) */
function createFakePrisma(tasks: WorkerGenTask[]) {
  const prisma = {
    genTask: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        tasks.find((t) => t.id === where.id) ?? null
      ),
      findMany: jest.fn(async ({ where }: { where: { status: string; createdAt?: { lt: Date } } }) =>
        tasks
          .filter((t) => t.status === where.status && (!where.createdAt || t.createdAt < where.createdAt.lt))
          .slice(0, 50)
      ),
      updateMany: jest.fn(async ({ where, data }: { where: { id: string; status?: string | { in: string[] } }; data: Record<string, unknown> }) => {
        const match = (t: WorkerGenTask) => {
          if (t.id !== where.id) return false;
          if (typeof where.status === 'string') return t.status === where.status;
          if (where.status && typeof where.status === 'object') return where.status.in.includes(t.status);
          return true;
        };
        const target = tasks.find(match);
        if (!target) return { count: 0 };
        Object.assign(target, data);
        return { count: 1 };
      })
    }
  };
  return prisma;
}

/** 脚本化 provider:按脚本依次返回轮询结果 */
function createScriptedProvider(script: Array<{ status: 'GENERATING' | 'COMPLETED' | 'FAILED'; progress: number; glbUrl?: string; errorCode?: string }>) {
  let pollIndex = 0;
  return {
    name: 'scripted',
    submit: jest.fn(async () => ({ providerTaskId: 'prov-1' })),
    poll: jest.fn(async () => {
      const step = script[Math.min(pollIndex, script.length - 1)];
      pollIndex += 1;
      return { ...step };
    })
  };
}

function createDeps(tasks: WorkerGenTask[], provider: ReturnType<typeof createScriptedProvider>) {
  const events: TaskProgressEvent[] = [];
  const credits: Array<{ userId: string; amount: number; key: string }> = [];
  const deps: GenerationProcessorDeps = {
    prisma: createFakePrisma(tasks) as never,
    provider: provider as never,
    token: {
      credit: jest.fn(async (userId: string, amount: number, _reason: never, key: string) => {
        credits.push({ userId, amount, key });
        return { created: true, balanceAfter: 0, entryId: 'e' };
      })
    } as never,
    publish: jest.fn(async (_channel: string, payload: string) => {
      events.push(JSON.parse(payload));
    }),
    pollIntervalMs: 1,
    sleep: jest.fn(async () => undefined) // 零等待:sleep 即时返回
  };
  return { deps, events, credits };
}

function makeTask(overrides: Partial<WorkerGenTask> = {}): WorkerGenTask {
  return {
    id: 'task-1',
    userId: 'user-1',
    status: 'DEDUCTED',
    providerTaskId: null,
    photoOssKey: null,
    params: {},
    progress: 0,
    createdAt: new Date(),
    ...overrides
  };
}

describe('processGenerationJob(mock 全链路)', () => {
  it('成功链路:DEDUCTED→SUBMITTED→GENERATING→COMPLETED,发布递增进度与 GLB key,无退款', async () => {
    const tasks = [makeTask()];
    const provider = createScriptedProvider([
      { status: 'GENERATING', progress: 40 },
      { status: 'GENERATING', progress: 80 },
      { status: 'COMPLETED', progress: 100, glbUrl: 'mock://glb/x' }
    ]);
    const { deps, events, credits } = createDeps(tasks, provider);

    const result = await processGenerationJob('task-1', deps);

    expect(result.finalStatus).toBe('COMPLETED');
    expect(tasks[0].status).toBe('COMPLETED');
    expect(tasks[0].progress).toBe(100);
    expect(tasks[0].glbOssKey).toBe('gen/glb/x');
    expect(credits).toHaveLength(0); // 成功不退款

    const statuses = events.map((e) => e.status);
    expect(statuses).toEqual(['SUBMITTED', 'GENERATING', 'GENERATING', 'COMPLETED']);
    expect(events.map((e) => e.progress)).toEqual([0, 40, 80, 100]);
  });

  it('失败链路:FAILED 全额退款 60,幂等键 gen-refund-full:taskId,事件带 errorCode', async () => {
    const tasks = [makeTask()];
    const provider = createScriptedProvider([
      { status: 'GENERATING', progress: 50 },
      { status: 'FAILED', progress: 60, errorCode: 'MOCK_INJECTED_FAILURE' }
    ]);
    const { deps, events, credits } = createDeps(tasks, provider);

    const result = await processGenerationJob('task-1', deps);

    expect(result.finalStatus).toBe('FAILED');
    expect(tasks[0].status).toBe('FAILED');
    expect(tasks[0].refundToken).toBe(60);
    expect(credits).toEqual([{ userId: 'user-1', amount: 60, key: 'gen-refund-full:task-1' }]);
    const last = events.at(-1)!;
    expect(last.status).toBe('FAILED');
    expect(last.errorCode).toBe('MOCK_INJECTED_FAILURE');
  });

  it('提交失败:DEDUCTED→REFUNDED_ALL + 全额退款', async () => {
    const tasks = [makeTask()];
    const provider = {
      name: 'broken',
      submit: jest.fn(async () => {
        throw new Error('provider unreachable');
      }),
      poll: jest.fn(async () => ({ status: 'GENERATING' as const, progress: 0 }))
    };
    const { deps, credits, events } = createDeps(tasks, provider as never);

    const result = await processGenerationJob('task-1', deps);

    expect(result.finalStatus).toBe('REFUNDED_ALL');
    expect(tasks[0].status).toBe('REFUNDED_ALL');
    expect(String(tasks[0].errorCode)).toContain('SUBMIT_FAILED');
    expect(credits).toHaveLength(1);
    expect(credits[0].amount).toBe(60);
    expect(events.at(-1)?.status).toBe('REFUNDED_ALL');
  });

  it('用户取消(API 侧已退款转 CANCELLED):worker 停止驱动不再退款', async () => {
    const tasks = [makeTask({ status: 'GENERATING', providerTaskId: 'prov-1', progress: 70 })];
    // 第二次 findUnique(轮询重读)前模拟用户取消:改写桩行为
    const provider = createScriptedProvider([{ status: 'GENERATING', progress: 75 }]);
    const { deps, credits } = createDeps(tasks, provider);
    (deps.prisma.genTask.findUnique as jest.Mock).mockImplementation(async () => {
      // 每次重读都返回已取消状态
      return makeTask({ status: 'CANCELLED', providerTaskId: 'prov-1', progress: 70 });
    });

    const result = await processGenerationJob('task-1', deps);

    expect(result.finalStatus).toBe('CANCELLED');
    expect(credits).toHaveLength(0);
  });

  it('终态任务重复投递:直接退出(幂等)', async () => {
    const tasks = [makeTask({ status: 'COMPLETED', progress: 100, providerTaskId: 'prov-1' })];
    const provider = createScriptedProvider([{ status: 'COMPLETED', progress: 100 }]);
    const { deps, events } = createDeps(tasks, provider);

    const result = await processGenerationJob('task-1', deps);
    expect(result.finalStatus).toBe('COMPLETED');
    expect(events).toHaveLength(0);
  });
});

describe('sweepStuckSubmitted(提交超时兜底)', () => {
  it('超时 DEDUCTED 任务被全额退款转 REFUNDED_ALL;未超时不动', async () => {
    const old = new Date(Date.now() - 600_000);
    const tasks = [
      makeTask({ id: 'stuck', createdAt: old }),
      makeTask({ id: 'fresh', createdAt: new Date() })
    ];
    const provider = createScriptedProvider([]);
    const { deps, credits } = createDeps(tasks, provider);

    const swept = await sweepStuckSubmitted(deps, 300_000);

    expect(swept).toBe(1);
    expect(tasks[0].status).toBe('REFUNDED_ALL');
    expect(tasks[1].status).toBe('DEDUCTED');
    expect(credits.map((c) => c.key)).toEqual(['gen-refund-full:stuck']);
  });
});
