/**
 * 职责:频控服务——Redis 固定窗口计数(INCR 首次置 EXPIRE),超限抛 RATE_LIMITED
 * 关联任务:T3;注入共享 REDIS_CLIENT,不新建连接
 */
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { AppErrorCode } from '@vrm/shared';
import { BizException } from '../biz.exception';
import { REDIS_CLIENT } from '../redis/redis.module';
import { fixedWindowKey, isAllowed, retryAfterSeconds, windowStart, RateLimitOptions } from './rate-limit.logic';

/** 限流判定结果(放行时 count 为本次计数值) */
export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds?: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * 计数并判定:超限直接抛 RATE_LIMITED(40904,含重试等待秒数)
   * Redis 不可用时放行(降级不阻断主链路,与 SSE 同口径),由调用方异常兜底
   */
  async consume(options: RateLimitOptions, principal: string): Promise<RateLimitResult> {
    const start = windowStart(Date.now(), options.windowSeconds);
    const key = fixedWindowKey(options.scope, principal, start);

    let count: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, options.windowSeconds);
      }
    } catch {
      // 中间件故障时降级放行:频控是防线不是依赖
      return { allowed: true, count: 0 };
    }

    if (isAllowed(count, options.limit)) {
      return { allowed: true, count };
    }

    throw BizException.of(
      AppErrorCode.RATE_LIMITED,
      `操作过于频繁,请 ${retryAfterSeconds(Date.now(), options.windowSeconds)} 秒后再试`
    );
  }
}
