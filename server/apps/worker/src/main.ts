/**
 * 职责:Worker 进程入口——建立 Redis/Prisma 连接、声明队列、注册消费者(生成/生命周期)、优雅停机
 * 关联任务:PKG-02(骨架)/ PKG-14(生成消费,T8 落地)/ PKG-20(生命周期扫描,B3)
 * 运行前提:本地 Redis/PG 已启动(server/docker-compose.yml);未启动时进程会打重连日志但不 panic
 */
import './load-env';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@vrm/database';
import { createGen3DProvider, env, QUEUE } from '@vrm/shared';
import { createGenerationWorker } from './workers/generation.worker';
import { createLifecycleScanWorker } from './workers/lifecycle-scan.worker';
import { createWorkerTokenService } from './services/worker-token.service';

const logger = new Logger('Worker');

async function bootstrap(): Promise<void> {
  // BullMQ 要求 maxRetriesPerRequest: null(阻塞式命令不允许应用层重试)
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (err) => logger.warn(`redis: ${err.message}`));

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL ?? env.DATABASE_URL } }
  });

  // 队列声明:入队方(apps/api)与消费方(本进程)引用 shared 的同一常量 QUEUE.*
  const generationQueue = new Queue(QUEUE.GENERATION, { connection });

  // 生成消费者:mock/meshy 供应商按 env 装配(外部 key 全缺时 mock 保真联调)
  const provider = createGen3DProvider();
  const workers = [
    createGenerationWorker(connection, {
      prisma: prisma as never,
      provider,
      token: createWorkerTokenService(prisma)
    }),
    createLifecycleScanWorker(connection, prisma)
  ];

  const startedAt = new Date().toISOString();
  logger.log(
    `worker up [queues: ${QUEUE.GENERATION}, ${QUEUE.LIFECYCLE_SCAN}] provider=${provider.name} at ${startedAt}`
  );

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received, shutting down...`);
    await Promise.allSettled(workers.map((w) => w.close()));
    await generationQueue.close();
    await prisma.$disconnect();
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
