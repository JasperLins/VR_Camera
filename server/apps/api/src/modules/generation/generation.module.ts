/**
 * 职责:生成模块装配——BullMQ 队列(入队侧)+ 服务与路由(PKG-14)
 * 说明:队列连接独立于共享 REDIS_CLIENT(BullMQ 要求 maxRetriesPerRequest:null);
 *       消费侧在 apps/worker(同一 QUEUE.GENERATION 常量)。
 */
import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env, QUEUE } from '@vrm/shared';
import { LedgerModule } from '../ledger/ledger.module';
import { GenerationController } from './generation.controller';
import { GENERATION_QUEUE, GenerationService } from './generation.service';

@Module({
  imports: [LedgerModule],
  controllers: [GenerationController],
  providers: [
    {
      provide: GENERATION_QUEUE,
      useFactory: (): Queue => {
        const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
        connection.on('error', () => undefined); // 队列连接错误由 BullMQ 内部重试,防未捕获异常
        return new Queue(QUEUE.GENERATION, { connection });
      }
    },
    GenerationService
  ],
  exports: [GenerationService]
})
export class GenerationModule {}
