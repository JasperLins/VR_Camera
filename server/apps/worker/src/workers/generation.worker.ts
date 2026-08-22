/**
 * 职责:生成任务 BullMQ 消费者——job→processGenerationJob 驱动状态机,失败重试由 BullMQ attempts 承载
 * 关联任务:PKG-14(O-3/T8);附 DEDUCTED 停滞扫描定时器(提交超时全额退款兜底)
 */
import { Logger } from '@nestjs/common';
import type { Worker as BullWorker } from 'bullmq';
import { Worker } from 'bullmq';
import type IORedis from 'ioredis';
import { env, QUEUE } from '@vrm/shared';
import { processGenerationJob, sweepStuckSubmitted, GenerationProcessorDeps } from '../services/generation-processor';

const logger = new Logger('GenerationWorker');

export function createGenerationWorker(
  connection: IORedis,
  deps: Pick<GenerationProcessorDeps, 'prisma' | 'provider' | 'token'>
): BullWorker {
  const fullDeps: GenerationProcessorDeps = {
    ...deps,
    publish: (channel, payload) => connection.publish(channel, payload)
  };

  const worker = new Worker(
    QUEUE.GENERATION,
    async (job) => {
      const taskId = job.data?.taskId as string | undefined;
      if (!taskId) {
        logger.warn(`job ${job.id} 缺少 taskId,丢弃`);
        return { finalStatus: 'INVALID_JOB' };
      }
      const result = await processGenerationJob(taskId, fullDeps);
      logger.log(`task ${taskId} -> ${result.finalStatus}`);
      return result;
    },
    { connection, concurrency: 4 }
  );

  worker.on('failed', (job, err) => {
    logger.warn(`job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  // 提交超时扫描:队列丢 job / api 崩溃在入队前 / provider 长期不可达的兜底退款
  const sweepTimer = setInterval(() => {
    void sweepStuckSubmitted(fullDeps, env.GEN_SUBMIT_TIMEOUT_MS).catch((err: Error) => {
      logger.warn(`stuck sweep failed: ${err.message}`);
    });
  }, 60_000);
  worker.on('closed', () => clearInterval(sweepTimer));

  return worker;
}
