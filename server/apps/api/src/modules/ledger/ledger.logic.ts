/**
 * 职责:Token 账本纯逻辑——取消比例退款计算、幂等键构造、余额充足判定(无框架依赖,可全量单测)
 * 关联需求:FR-07/FR-04;关联任务:PKG-13(P-1)/ PKG-14(取消退款复用)
 * 口径:取消按进度比例退款(80% 进度退 20%,tech-stack §7.1 状态机注释)
 */
import { TOKEN_ECONOMY } from '@vrm/shared';

/** 取消退款的进度步进上限(超过该进度不可取消,由状态机层守卫) */
export const CANCEL_PROGRESS_CEILING = 99;

/**
 * 取消退款额:进度 80% → 退 20%;进度 0 → 全退。
 * 公式:refund = round(cost × (100 - progress) / 100),下限 0(进度封顶时),上限 cost。
 */
export function computeCancelRefund(cost: number, progressPercent: number): number {
  const progress = Math.min(Math.max(progressPercent, 0), 100);
  const refund = Math.round((cost * (100 - progress)) / 100);
  return Math.min(Math.max(refund, 0), cost);
}

/** 幂等键种类的集中定义(账本 idempotency_key 的格式唯一来源,禁止散落拼字符串) */
export const IdempotencyKind = {
  REGISTER_GRANT: 'register-grant',
  GEN_DEBIT: 'gen-debit',
  GEN_REFUND_FULL: 'gen-refund-full',
  GEN_REFUND_CANCEL: 'gen-refund-cancel',
  ADMIN_ADJUST: 'admin-adjust'
} as const;

export type IdempotencyKindValue = (typeof IdempotencyKind)[keyof typeof IdempotencyKind];

/** 构造幂等键:kind:refId(同一业务动作重放命中同一条流水) */
export function buildIdempotencyKey(kind: IdempotencyKindValue, refId: string): string {
  if (!refId) {
    throw new Error('幂等键 refId 不能为空');
  }
  return `${kind}:${refId}`;
}

/** 余额充足判定(纯函数,service 层据此决定是否抛 INSUFFICIENT_TOKEN) */
export function isSufficient(balance: number, amount: number): boolean {
  return balance >= amount && amount > 0;
}

/** 生成扣减的标准入参校验:金额必须为正整数(Token 最小单位=1) */
export function assertValidAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`金额必须为正整数: ${amount}`);
  }
}

/** 注册赠送金额(D-049:80,唯一出口,禁止硬编码) */
export const registerGrantAmount = (): number => TOKEN_ECONOMY.REGISTER_GRANT;
