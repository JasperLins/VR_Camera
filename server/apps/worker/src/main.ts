/**
 * 职责:Worker 进程入口——建立 Redis 连接、声明队列、注册消费者、优雅停机
 * 关联任务:PKG-02(骨架)/ PKG-14(生成消费,B2 填充)/ PKG-20(生命周期扫描,B3 填充)
 * 运行前提:本地 Redis 已启动(server/docker-compose.yml);未启动时进程会打重连日志但不 panic
 */
import './load-env';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env, QUEUE } from '@vrm/shared';
import { createLifecycleScanWorker } from './workers/lifecycle-scan.worker';

const logger = new Logger('Worker');

async function bootstrap(): Promise<void> {
  // BullMQ 要求 maxRetriesPerRequest: null(阻塞式命令不允许应用层重试)
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (err) => logger.warn(`redis: ${err.message}`));

  // 队列声明:入队方(apps/api)与消费方(本进程)引用 shared 的同一常量 QUEUE.*
  const generationQueue = new Queue(QUEUE.GENERATION, { connection });

  // 消费者注册(当前仅生命周期扫描占位;生成消费者 B2/PKG-14 落地)
  const workers = [createLifecycleScanWorker(connection)];

  const startedAt = new Date().toISOString();
  logger.log(`worker up [queues: ${QUEUE.GENERATION}, ${QUEUE.LIFECYCLE_SCAN}] at ${startedAt}`);

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received, shutting down...`);
    await Promise.allSettled(workers.map((w) => w.close()));
    await generationQueue.close();
    connection.quit();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error(`bootstrap failed: ${err instanceof Error ? err.stack ?? err.message : err}`);
  process.exit(1);
});

export { bootstrap };
