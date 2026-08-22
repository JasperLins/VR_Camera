/**
 * 职责:频控模块装配——@Global 导出 RateLimitService,各业务模块直接注入即可
 * 关联任务:T3;守卫实例化由 Nest 依赖注入自动解析(Reflector + RateLimitService)
 */
import { Global, Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [RateLimitService],
  exports: [RateLimitService]
})
export class RateLimitModule {}
