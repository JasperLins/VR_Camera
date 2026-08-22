/**
 * 职责:幂等键种类与构造——账本 idempotency_key 格式的唯一来源(api 与 worker 共用,禁止散落拼字符串)
 * 关联任务:PKG-13(P-1)/ PKG-14(worker 退款复用);从 apps/api ledger.logic 上移(CONVENTIONS §1 公共抽取)
 */

/** 幂等键种类的集中定义(同一业务动作重放命中同一条流水) */
export const IdempotencyKind = {
  REGISTER_GRANT: 'register-grant',
  GEN_DEBIT: 'gen-debit',
  GEN_REFUND_FULL: 'gen-refund-full',
  GEN_REFUND_CANCEL: 'gen-refund-cancel',
  POINTS_GRANT: 'points-grant',
  STORE_REDEEM: 'store-redeem',
  ADMIN_ADJUST: 'admin-adjust'
} as const;

export type IdempotencyKindValue = (typeof IdempotencyKind)[keyof typeof IdempotencyKind];

/** 构造幂等键:kind:refId */
export function buildIdempotencyKey(kind: IdempotencyKindValue, refId: string): string {
  if (!refId) {
    throw new Error('幂等键 refId 不能为空');
  }
  return `${kind}:${refId}`;
}
