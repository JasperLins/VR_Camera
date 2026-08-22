/**
 * 职责:频控守卫与装饰器——@RateLimit({limit, windowSeconds, scope}) + @UseGuards(..., RateLimitGuard)
 * 关联任务:T3;用法:放在 JwtAuthGuard 之后按 userId 限流,单独使用按客户端 IP 限流
 */
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { assertOptions, RateLimitOptions } from './rate-limit.logic';

export const RATE_LIMIT_META = 'rate-limit:options';

/** 路由级频控配置装饰器(方法或控制器级;方法覆盖控制器) */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_META, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_META, context.getHandler()) ??
      this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_META, context.getClass());
    if (!options) {
      // 未标注频控配置的路由不做限流(守卫仅对显式声明的触点生效)
      return true;
    }
    assertOptions(options);

    const request = context.switchToHttp().getRequest<Request & { user?: { id?: string } }>();
    const principal = request.user?.id ?? request.ip ?? 'unknown';
    await this.rateLimit.consume(options, principal);
    return true;
  }
}
