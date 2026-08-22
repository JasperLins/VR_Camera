/**
 * 职责:积分纯逻辑——年抵扣上限(D-045:200 Token 等值/人/年)/幂等键种类/金额校验
 * 关联需求:FR-08;关联任务:PKG-18(P-3/T12);决策:D-009(10:1 单向,仅商店下载)
 */
import { IdempotencyKind, buildIdempotencyKey } from '@vrm/shared';
import { TOKEN_ECONOMY } from '@vrm/shared';

export { IdempotencyKind, buildIdempotencyKey };

/** 年兑换上限:200 枚 Token 等值(D-045)→ 200 × 10 = 2000 积分/自然年 */
export const YEARLY_REDEEM_CAP_POINTS = 200 * TOKEN_ECONOMY.POINTS_PER_TOKEN;

/** 年度剩余可抵扣额度 */
export function yearlyRedeemRemaining(yearSpent: number): number {
  return Math.max(0, YEARLY_REDEEM_CAP_POINTS - Math.max(0, yearSpent));
}

/** 自然年起点(用于聚合当年 STORE_REDEEM 支出) */
export function startOfYear(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

/** 金额校验(正整数,积分最小单位 1) */
export function assertValidPointsAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`积分金额必须为正整数: ${amount}`);
  }
}

/** 抵扣校验:10 积分 = 1 Token,抵扣数必须能整除兑换(D-009 单向口径) */
export function assertRedeemableByRate(points: number): void {
  assertValidPointsAmount(points);
  if (points % TOKEN_ECONOMY.POINTS_PER_TOKEN !== 0) {
    throw new Error(`抵扣粒度必须为 ${TOKEN_ECONOMY.POINTS_PER_TOKEN} 的整数倍(10 积分 = 1 Token)`);
  }
}
