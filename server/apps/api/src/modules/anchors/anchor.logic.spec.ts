/**
 * 职责:锚点纯逻辑单测——失效档位/回收期/放置校验/口令哈希与生成(T14/T15 验收)
 */
import {
  EXPIRY_OPTIONS,
  expiresAtFrom,
  generateShareToken,
  hashShareToken,
  recycleDeadline,
  validatePlacement
} from './anchor.logic';

describe('anchor.logic', () => {
  describe('expiresAtFrom', () => {
    const now = new Date('2026-08-23T00:00:00Z');
    it('7d/30d/永久三档', () => {
      expect(expiresAtFrom('7d', now)?.toISOString()).toBe('2026-08-30T00:00:00.000Z');
      expect(expiresAtFrom('30d', now)?.toISOString()).toBe('2026-09-22T00:00:00.000Z');
      expect(expiresAtFrom('forever', now)).toBeNull();
    });
  });

  describe('recycleDeadline', () => {
    it('删除时间 + 30 天', () => {
      const deleted = new Date('2026-08-01T00:00:00Z');
      expect(recycleDeadline(deleted).toISOString()).toBe('2026-08-31T00:00:00.000Z');
    });
  });

  describe('validatePlacement', () => {
    const valid = {
      latitude: 30.259,
      longitude: 120.166,
      altitude: 15,
      visibility: 'PUBLIC' as const,
      expiry: '30d' as const
    };

    it('合法公开内容通过', () => {
      expect(validatePlacement(valid)).toBeNull();
    });

    it('私密内容强制永久(D-012)', () => {
      expect(validatePlacement({ ...valid, visibility: 'PRIVATE', expiry: '7d' })).toMatch(/永久/);
      expect(validatePlacement({ ...valid, visibility: 'PRIVATE', expiry: 'forever' })).toBeNull();
    });

    it('坐标/海拔非法拒绝', () => {
      expect(validatePlacement({ ...valid, latitude: 91 })).toMatch(/纬度/);
      expect(validatePlacement({ ...valid, longitude: -181 })).toMatch(/经度/);
      expect(validatePlacement({ ...valid, altitude: Number.NaN })).toMatch(/海拔/);
    });
  });

  describe('口令', () => {
    it('生成 8 位数字', () => {
      const token = generateShareToken();
      expect(token).toMatch(/^\d{8}$/);
    });

    it('哈希稳定且不可逆推明文形态', () => {
      expect(hashShareToken('12345678')).toBe(hashShareToken('12345678'));
      expect(hashShareToken('12345678')).not.toBe(hashShareToken('12345679'));
      expect(hashShareToken('12345678')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it('EXPIRY_OPTIONS 值域(7d/30d/forever)', () => {
    expect(Object.values(EXPIRY_OPTIONS).sort()).toEqual(['30d', '7d', 'forever']);
  });
});
