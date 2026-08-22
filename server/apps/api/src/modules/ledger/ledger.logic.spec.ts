/**
 * 职责:账本纯逻辑单测——取消比例退款/幂等键/金额校验(PKG-13 DoD:核心纯逻辑覆盖线)
 */
import { buildIdempotencyKey, computeCancelRefund, assertValidAmount, isSufficient } from './ledger.logic';
import { TOKEN_ECONOMY } from '@vrm/shared';

describe('computeCancelRefund', () => {
  it('进度 80% → 退 20%(PRD 口径示例)', () => {
    expect(computeCancelRefund(60, 80)).toBe(12);
  });

  it('进度 0 → 全退;进度 100 → 不退', () => {
    expect(computeCancelRefund(60, 0)).toBe(60);
    expect(computeCancelRefund(60, 100)).toBe(0);
  });

  it('四舍五入到整数 Token:进度 33% 退 67% → 60×0.67=40.2 → 40', () => {
    expect(computeCancelRefund(60, 33)).toBe(40);
  });

  it('进度越界被钳制(-10 → 0%;150 → 100%)', () => {
    expect(computeCancelRefund(60, -10)).toBe(60);
    expect(computeCancelRefund(60, 150)).toBe(0);
  });

  it('以生成价 60 Token 为基线的整表(状态机注释口径)', () => {
    const cost = TOKEN_ECONOMY.GENERATION_COST;
    expect(computeCancelRefund(cost, 0)).toBe(60);
    expect(computeCancelRefund(cost, 25)).toBe(45);
    expect(computeCancelRefund(cost, 50)).toBe(30);
    expect(computeCancelRefund(cost, 80)).toBe(12);
  });
});

describe('buildIdempotencyKey', () => {
  it('kind:refId 格式', () => {
    expect(buildIdempotencyKey('gen-debit', 'task-1')).toBe('gen-debit:task-1');
  });

  it('空 refId 抛错(防止全站幂等键退化成裸 kind)', () => {
    expect(() => buildIdempotencyKey('gen-debit', '')).toThrow();
  });
});

describe('isSufficient / assertValidAmount', () => {
  it('余额充足判定含等号(=可用)', () => {
    expect(isSufficient(60, 60)).toBe(true);
    expect(isSufficient(59, 60)).toBe(false);
    expect(isSufficient(60, 0)).toBe(false);
  });

  it('金额必须为正整数', () => {
    expect(() => assertValidAmount(0)).toThrow();
    expect(() => assertValidAmount(-5)).toThrow();
    expect(() => assertValidAmount(1.5)).toThrow();
    expect(() => assertValidAmount(60)).not.toThrow();
  });
});
