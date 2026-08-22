/**
 * 职责:积分纯逻辑单测——年抵扣上限(D-045)/粒度校验/自然年起点(T12)
 */
import { assertRedeemableByRate, startOfYear, yearlyRedeemRemaining, YEARLY_REDEEM_CAP_POINTS } from './points.logic';

describe('points.logic', () => {
  it('年上限 = 200 Token 等值 = 2000 积分', () => {
    expect(YEARLY_REDEEM_CAP_POINTS).toBe(2000);
  });

  it('剩余额度随年支出递减,不为负', () => {
    expect(yearlyRedeemRemaining(0)).toBe(2000);
    expect(yearlyRedeemRemaining(1990)).toBe(10);
    expect(yearlyRedeemRemaining(3000)).toBe(0);
  });

  it('抵扣粒度:10 的倍数通过,否则拒绝', () => {
    expect(() => assertRedeemableByRate(10)).not.toThrow();
    expect(() => assertRedeemableByRate(2000)).not.toThrow();
    expect(() => assertRedeemableByRate(15)).toThrow();
    expect(() => assertRedeemableByRate(0)).toThrow();
  });

  it('自然年起点(UTC)', () => {
    expect(startOfYear(new Date('2026-08-23T12:00:00Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
