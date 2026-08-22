/**
 * 职责:应用根模块——装配全局过滤器/拦截器与业务模块(新业务模块必须在此 imports 注册)
 * 关联任务:PKG-02
 */
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SseModule } from './modules/sse/sse.module';

@Module({
  imports: [PrismaModule, RedisModule, RateLimitModule, AuthModule, LedgerModule, SseModule, HealthModule],
  providers: [
    // 全局异常过滤器:所有未捕获异常统一落装为业务错误信封
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // 全局信封拦截器:成功响应统一 {code:0,message:'ok',data,requestId} + 访问日志
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor }
  ]
})
export class AppModule {}
