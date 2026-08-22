/**
 * 职责:健康检查服务——DB/Redis 依赖探活,汇总 up/degraded 报告(不抛异常,探针永远 200)
 * 关联任务:PKG-02;验收线:dev-environment.md §5「pnpm start:dev 健康检查 200」
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppErrorCode } from '@vrm/shared';
import type Redis from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

export interface HealthReport {
  status: 'ok' | 'degraded';
  dependencies: { db: 'up' | 'down'; redis: 'up' | 'down' };
  checkedAt: string;
  /** 降级时的提示码(AppErrorCode.DEPENDENCY_UNAVAILABLE) */
  hint?: number;
}type DependencyState = 'up' | 'down';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  async check(): Promise<HealthReport> {
    const [db, cache] = await Promise.all([this.probeDb(), this.probeRedis()]);
    const degraded = db === 'down' || cache === 'down';
    return {
      status: degraded ? 'degraded' : 'ok',
      dependencies: { db, redis: cache },
      checkedAt: new Date().toISOString(),
      ...(degraded ? { hint: AppErrorCode.DEPENDENCY_UNAVAILABLE } : {})
    };
  }

  private async probeDb(): Promise<DependencyState> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (err) {
      this.logger.warn(`db probe failed: ${(err as Error).message}`);
      return 'down';
    }
  }

  private async probeRedis(): Promise<DependencyState> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch (err) {
      this.logger.warn(`redis probe failed: ${(err as Error).message}`);
      return 'down';
    }
  }
}
