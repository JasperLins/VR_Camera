/**
 * 职责:频控服务单测——Redis 桩验证 INCR/EXPIRE 编排与超限异常/降级放行(T3)
 */
import { BizException } from '../biz.exception';
import { RateLimitService } from './rate-limit.service';

function createFakeRedis() {
  const state = new Map<string, number>();
  const commands: string[] = [];
  const redis = {
    incr: jest.fn(async (key: string) => {
      commands.push(`INCR ${key}`);
      const next = (state.get(key) ?? 0) + 1;
      state.set(key, next);
      return next;
    }),
    expire: jest.fn(async (key: string, seconds: number) => {
      commands.push(`EXPIRE ${key} ${seconds}`);
      return 1;
    })
  };
  return { redis, state, commands };
}

describe('RateLimitService.consume', () => {
  const options = { limit: 2, windowSeconds: 60, scope: 'checkin' };

  it('窗口内前 limit 次放行,第 limit+1 次抛 RATE_LIMITED', async () => {
    const { redis } = createFakeRedis();
    const service = new RateLimitService(redis as never);

    const first = await service.consume(options, 'user-1');
    const second = await service.consume(options, 'user-1');
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);

    await expect(service.consume(options, 'user-1')).rejects.toMatchObject({ bizCode: 40904 });
  });

  it('首次计数才设置 EXPIRE(窗口 TTL 一次落装)', async () => {
    const { redis, commands } = createFakeRedis();
    const service = new RateLimitService(redis as never);

    await service.consume(options, 'user-2');
    await service.consume(options, 'user-2');
    await service.consume(options, 'user-2').catch(() => undefined); // 超限(不影响 EXPIRE 断言)

    const expires = commands.filter((c) => c.startsWith('EXPIRE'));
    expect(expires).toHaveLength(1);
    expect(expires[0]).toMatch(/rl:checkin:user-2:\d+ 60$/);
  });

  it('不同 principal 相互独立', async () => {
    const { redis } = createFakeRedis();
    const service = new RateLimitService(redis as never);

    await service.consume(options, 'user-a');
    await service.consume(options, 'user-a');
    const other = await service.consume(options, 'user-b');
    expect(other.allowed).toBe(true);
  });

  it('Redis 故障时降级放行(不阻断主链路)', async () => {
    const redis = {
      incr: jest.fn(async () => {
        throw new Error('connection refused');
      }),
      expire: jest.fn()
    };
    const service = new RateLimitService(redis as never);

    const result = await service.consume(options, 'user-1');
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(0);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('BizException 语义核验(错误码 + 含等待秒数的提示)', async () => {
    const { redis } = createFakeRedis();
    const service = new RateLimitService(redis as never);

    await service.consume({ ...options, limit: 1 }, 'user-3');
    try {
      await service.consume({ ...options, limit: 1 }, 'user-3');
      fail('应当抛出 RATE_LIMITED');
    } catch (err) {
      expect(err).toBeInstanceOf(BizException);
      const message = (err as BizException).message;
      expect(message).toMatch(/秒后再试/);
    }
  });
});
