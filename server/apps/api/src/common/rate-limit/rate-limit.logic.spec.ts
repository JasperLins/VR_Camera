/**
 * 职责:频控纯逻辑单测——窗口边界/key 构造/判定/重试等待(T3 验收:单测绿)
 */
import { assertOptions, fixedWindowKey, isAllowed, retryAfterSeconds, windowStart } from './rate-limit.logic';

describe('rate-limit.logic', () => {
  describe('windowStart', () => {
    it('60s 窗口:同分钟内任意时刻落到同一窗口起点', () => {
      expect(windowStart(Date.UTC(2026, 0, 1, 0, 0, 0, 0), 60)).toBe(Date.UTC(2026, 0, 1, 0, 0, 0) / 1000);
      expect(windowStart(Date.UTC(2026, 0, 1, 0, 0, 59, 999), 60)).toBe(Date.UTC(2026, 0, 1, 0, 0, 0) / 1000);
    });

    it('跨窗口边界翻页', () => {
      const a = windowStart(Date.UTC(2026, 0, 1, 0, 0, 59, 999), 60);
      const b = windowStart(Date.UTC(2026, 0, 1, 0, 1, 0, 0), 60);
      expect(b - a).toBe(60);
    });
  });

  describe('fixedWindowKey', () => {
    it('包含 scope/principal/窗口起点三段', () => {
      expect(fixedWindowKey('checkin', 'user-1', 100)).toBe('rl:checkin:user-1:100');
    });
  });

  describe('isAllowed', () => {
    it('第 limit 次放行,超限拒绝', () => {
      expect(isAllowed(1, 3)).toBe(true);
      expect(isAllowed(3, 3)).toBe(true);
      expect(isAllowed(4, 3)).toBe(false);
    });
  });

  describe('retryAfterSeconds', () => {
    it('窗口末尾等待 1s,窗口开头等待整个窗口', () => {
      const windowMs = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
      expect(retryAfterSeconds(windowMs + 59_000, 60)).toBe(1);
      expect(retryAfterSeconds(windowMs, 60)).toBe(60);
    });
  });

  describe('assertOptions', () => {
    it('非法 limit/windowSeconds/scope 抛错', () => {
      expect(() => assertOptions({ limit: 0, windowSeconds: 60, scope: 'x' })).toThrow();
      expect(() => assertOptions({ limit: 1, windowSeconds: 0, scope: 'x' })).toThrow();
      expect(() => assertOptions({ limit: 1, windowSeconds: 60, scope: '' })).toThrow();
      expect(() => assertOptions({ limit: 1, windowSeconds: 60, scope: 'x' })).not.toThrow();
    });
  });
});
