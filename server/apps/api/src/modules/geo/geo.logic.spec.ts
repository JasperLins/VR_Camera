/**
 * 职责:地理查询纯逻辑单测——半径上限/海拔容差片段/可见性口径(T4 验收:过滤逻辑纯函数单测)
 */
import { altitudeFilterSql, assertNearbyParams, assertValidRadius, visibilityFilterSql } from './geo.logic';

describe('geo.logic', () => {
  describe('assertValidRadius', () => {
    it('允许 500/1000/5000,拒绝超上限与非正数', () => {
      expect(() => assertValidRadius(500)).not.toThrow();
      expect(() => assertValidRadius(5000)).not.toThrow();
      expect(() => assertValidRadius(5001)).toThrow(/上限/);
      expect(() => assertValidRadius(0)).toThrow();
      expect(() => assertValidRadius(-1)).toThrow();
    });
  });

  describe('assertNearbyParams', () => {
    it('合法参数通过;海拔非法拒绝', () => {
      expect(() => assertNearbyParams(30, 120, 500, 10)).not.toThrow();
      expect(() => assertNearbyParams(30, 120, 500, Number.NaN)).toThrow();
      expect(() => assertNearbyParams(91, 120, 500, 10)).toThrow();
    });
  });

  describe('visibilityFilterSql', () => {
    it('SQL 片段包含 PUBLIC/本人/授权名单三通道', () => {
      const sql = visibilityFilterSql('user-1');
      const text = sql.strings.join('');
      expect(text).toContain("a.visibility = 'PUBLIC'");
      expect(text).toContain('a.user_id =');
      expect(text).toContain('anchor_grants');
    });
  });

  describe('altitudeFilterSql', () => {
    it('±5m 容差区间参数化(BETWEEN 两端)', () => {
      const sql = altitudeFilterSql(10);
      expect(sql.values).toEqual([5, 15]);
      expect(sql.strings.join('')).toContain('BETWEEN');
    });
  });
});
