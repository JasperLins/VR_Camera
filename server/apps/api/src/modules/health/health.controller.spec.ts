/**
 * 职责:健康检查控制器单测——路由委托 service、Swagger 标签正确
 * 关联任务:PKG-02(测试管线样板)
 */
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: jest.Mocked<Pick<HealthService, 'check'>>;

  beforeEach(async () => {
    service = { check: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }]
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('check 委托 HealthService.check 并原样返回报告', async () => {
    const report = {
      status: 'ok' as const,
      dependencies: { db: 'up' as const, redis: 'up' as const },
      checkedAt: '2026-08-22T00:00:00.000Z'
    };
    service.check.mockResolvedValue(report);

    await expect(controller.check()).resolves.toEqual(report);
    expect(service.check).toHaveBeenCalledTimes(1);
  });
});
