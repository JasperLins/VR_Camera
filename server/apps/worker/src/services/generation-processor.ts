/**
 * 职责:生成任务消费核心——受理(DEDUCTED→SUBMITTED)→ 进度爬坡(→GENERATING)→ 终态
 *       (COMPLETED 带 GLB key / FAILED 全额退款),进度经 Redis pub/sub 发布供 SSE 转发
 * 关联需求:FR-04;关联任务:PKG-14(O-3/T8);状态机唯一事实源=gen_tasks 表
 * 依赖注入:prisma/provider/token/publish/sleep 全部由调用方注入(单测用桩,运行期接真实件)
 */
import { LedgerReason } from '@vrm/database';
import {
    buildIdempotencyKey,
    canTransition,
    GenTaskStatus as S,
    GEN_TASK_TERMINAL_STATES,
    IdempotencyKind,
    taskChannel,
    TOKEN_ECONOMY
} from '@vrm/shared';
import type { Gen3DProvider, GenTagParams } from '@vrm/shared';
import type { WorkerGenTask, WorkerPrisma, WorkerTokenService } from './worker-types';

export interface GenerationProcessorDeps {
  prisma: WorkerPrisma;
  provider: Gen3DProvider;
  token: WorkerTokenService;
  publish: (channel: string, payload: string) => Promise<unknown>;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/** 进度事件负载(SSE data 帧) */
export interface TaskProgressEvent {
  taskId: string;
  status: string;
  progress: number;
  glbOssKey?: string;
  errorCode?: string;
  refundToken?: number;
}

const TERMINAL = GEN_TASK_TERMINAL_STATES;
const COST = TOKEN_ECONOMY.GENERATION_COST;

/** 单任务全生命周期驱动(BullMQ job 处理器调用;幂等:终态/已被并发迁移时安全退出) */
export async function processGenerationJob(taskId: string, deps: GenerationProcessorDeps): Promise<{ finalStatus: string }> {
  const { prisma, provider, publish } = deps;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const pollIntervalMs = deps.pollIntervalMs ?? 500;

  const emit = (event: TaskProgressEvent) => publish(taskChannel(taskId), JSON.stringify(event));

  let task = await prisma.genTask.findUnique({ where: { id: taskId } });
  if (!task) {
    return { finalStatus: 'MISSING' };
  }
  if (TERMINAL.has(task.status as S)) {
    return { finalStatus: task.status };
  }

  // ---- 阶段 1:受理(DEDUCTED → SUBMITTED,拿 providerTaskId) ----
  if (task.status === S.DEDUCTED) {
    let providerTaskId: string;
    try {
      const submitted = await provider.submit({
        taskId,
        photoOssKey: task.photoOssKey ?? 'pending-upload',
        params: (task.params ?? {}) as GenTagParams
      });
      providerTaskId = submitted.providerTaskId;
    } catch (err) {
      // 提交失败:DEDUCTED → REFUNDED_ALL + 全额退(tech-stack §7.1 状态机口径)
      await closeWithFullRefund(
        deps,
        task,
        S.REFUNDED_ALL,
        `SUBMIT_FAILED: ${err instanceof Error ? err.message.slice(0, 180) : 'unknown'}`
      );
      return { finalStatus: S.REFUNDED_ALL };
    }

    const moved = await prisma.genTask.updateMany({
      where: { id: taskId, status: S.DEDUCTED },
      data: { status: S.SUBMITTED, providerTaskId }
    });
    if (moved.count === 0) {
      return { finalStatus: 'RACED' }; // 并发取消/超时退款已迁移
    }
    await emit({ taskId, status: S.SUBMITTED, progress: 0 });
    task = (await prisma.genTask.findUnique({ where: { id: taskId } }))!;
  }

  // ---- 阶段 2:轮询进度直至终态 ----
  for (;;) {
    await sleep(pollIntervalMs);

    const fresh = await prisma.genTask.findUnique({ where: { id: taskId } });
    if (!fresh || TERMINAL.has(fresh.status as S)) {
      // 用户取消(API 侧已退款)或超时退款 → 停止驱动
      return { finalStatus: fresh?.status ?? 'MISSING' };
    }
    if (fresh.providerTaskId == null) {
      return { finalStatus: 'NO_PROVIDER_TASK' };
    }

    const polled = await provider.poll(fresh.providerTaskId);

    if (polled.status === 'COMPLETED') {
      const glbOssKey = toOssKey(polled.glbUrl);
      const done = await prisma.genTask.updateMany({
        where: { id: taskId, status: { in: [S.SUBMITTED, S.GENERATING] } },
        data: { status: S.COMPLETED, progress: 100, glbOssKey }
      });
      if (done.count > 0) {
        await emit({ taskId, status: S.COMPLETED, progress: 100, glbOssKey });
      }
      return { finalStatus: S.COMPLETED };
    }

    if (polled.status === 'FAILED') {
      await closeWithFullRefund(deps, fresh, S.FAILED, polled.errorCode ?? 'PROVIDER_FAILED', {
        progress: polled.progress
      });
      return { finalStatus: S.FAILED };
    }

    // 进度事件:SUBMITTED → GENERATING 首迁;GENERATING 自循环仅更新 progress(状态机口径)
    const next: S = fresh.status === S.SUBMITTED ? S.GENERATING : (fresh.status as S);
    const legal =
      canTransition(fresh.status as S, next) ||
      (fresh.status === S.GENERATING && next === S.GENERATING); // 自循环=进度更新,不算状态迁移
    if (!legal) {
      continue;
    }
    const progress = Math.min(99, polled.progress);
    const updated = await prisma.genTask.updateMany({
      where: { id: taskId, status: fresh.status },
      data: { status: next, progress: Math.max(fresh.progress, progress) }
    });
    if (updated.count > 0) {
      await emit({ taskId, status: next, progress });
    }
  }
}

/** DEDUCTED 停滞扫描:超过提交超时的任务全额退款转 REFUNDED_ALL(队列丢 job/进程崩溃兜底) */
export async function sweepStuckSubmitted(deps: GenerationProcessorDeps, timeoutMs: number): Promise<number> {
  const { prisma } = deps;
  const deadline = new Date(Date.now() - timeoutMs);
  const stuck = await prisma.genTask.findMany({
    where: { status: S.DEDUCTED, createdAt: { lt: deadline } },
    take: 50
  });

  let swept = 0;
  for (const task of stuck) {
    // 迁移+退款+发布统一走 closeWithFullRefund 的条件更新(单飞保证)
    await closeWithFullRefund(deps, task, S.REFUNDED_ALL, 'SUBMIT_TIMEOUT');
    swept += 1;
  }
  return swept;
}

/**
 * 终态迁移 + 全额退款 + 事件发布(FAILED/REFUNDED_ALL 共用):
 * 条件 updateMany 保证单飞(并发/重试下只有一次迁移与一次入账,幂等键再兜一层);
 * extra 附带落库字段(FAILED 的 progress 等)。
 */
async function closeWithFullRefund(
  deps: GenerationProcessorDeps,
  task: WorkerGenTask,
  terminal: S,
  errorCode: string,
  extra?: { progress?: number }
): Promise<void> {
  const { prisma, token, publish } = deps;
  const from: S[] = terminal === S.FAILED ? [S.SUBMITTED, S.GENERATING] : [S.DEDUCTED, S.SUBMITTED];

  const closed = await prisma.genTask.updateMany({
    where: { id: task.id, status: { in: from } },
    data: { status: terminal, errorCode, refundToken: COST, ...(extra ?? {}) }
  });
  if (closed.count === 0) {
    return; // 已被并发迁移(取消/重试),退款由幂等键或对侧负责
  }

  await token.credit(
    task.userId,
    COST,
    LedgerReason.GENERATION_REFUND_FULL,
    buildIdempotencyKey(IdempotencyKind.GEN_REFUND_FULL, task.id),
    task.id
  );
  await publish(
    taskChannel(task.id),
    JSON.stringify({
      taskId: task.id,
      status: terminal,
      progress: extra?.progress ?? 0,
      errorCode,
      refundToken: COST
    } satisfies TaskProgressEvent)
  );
}

/** mock glbUrl → OSS key 占位转换(真实转存 OSS 属 O-4 人工批次) */
function toOssKey(glbUrl: string | undefined): string {
  return glbUrl ? `gen/${glbUrl.replace(/^\w+:\/\//, '')}` : 'gen/pending-transfer';
}
