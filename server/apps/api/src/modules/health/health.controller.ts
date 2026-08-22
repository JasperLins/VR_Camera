/**
 * 职责:健康检查路由——GET /v1/health(容器/负载均衡/本地首次构建验收的探针入口)
 * 关联任务:PKG-02
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthReport, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '存活探针(含 DB/Redis 依赖状态)' })
  async check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
