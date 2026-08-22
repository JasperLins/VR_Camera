/**
 * 职责:健康检查模块装配
 * 关联任务:PKG-02
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
