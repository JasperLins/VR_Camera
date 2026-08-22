/**
 * 职责:Redis 模块——@Global 提供共享 ioredis 连接(缓存/探活/SSE pub-sub 复用;
 *       BullMQ 队列连接由各使用方自建,因 BullMQ 要求 maxRetriesPerRequest:null)
 * 关联任务:PKG-02 / PKG-08(L-3)
 */
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { env } from '@vrm/shared';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 500, 5000)
        });
        // 必须挂接 error 监听:否则中间件未启动时连接错误会升级为未捕获异常
        client.on('error', (err) => new Logger('Redis').warn(`redis: ${err.message}`));
        return client;
      }
    }
  ],
  exports: [REDIS_CLIENT]
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
