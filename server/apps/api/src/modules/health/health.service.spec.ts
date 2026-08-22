/**
 * 职责:健康检查服务单测——依赖 up/down 四种组合的状态汇总与降级提示码
 * 关联任务:PKG-02
 */
import { AppErrorCode } from '@vrm/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const prisma = { $queryRaw: jest.fn() };
  const redis = { ping: jest.fn() };

  const createService = () => {
    return new HealthService(prisma as unknown as PrismaService, redis as never);
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('双依赖正常 → status ok,无提示码', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    redis.ping.mockResolvedValue('PONG');

    const report = await createService().check();

    expect(report.status).toBe('ok');
    expect(report.dependencies).toEqual({ db: 'up', redis: 'up' });
    expect(report.hint).toBeUndefined();
  });

  it('DB 探活失败 → status degraded + hint DEPENDENCY_UNAVAILABLE', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connect ECONNREFUSED'));
    redis.ping.mockResolvedValue('PONG');

    const report = await createService().check();

    expect(report.status).toBe('degraded');
    expect(report.dependencies.db).toBe('down');
    expect(report.hint).toBe(AppErrorCode.DEPENDENCY_UNAVAILABLE);
  });

  it('Redis 返回非 PONG → redis down', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    redis.ping.mockResolvedValue('WRONG');

    const report = await createService().check();

    expect(report.dependencies.redis).toBe('down');
    expect(report.status).toBe('degraded');
  });

  it('双依赖全挂 → degraded,不抛异常(探针恒 200)', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));
    redis.ping.mockRejectedValue(new Error('redis down'));

    const report = await createService().check();

    expect(report.status).toBe('degraded');
    expect(report.checkedAt).toBeTruthy();
  });
});
