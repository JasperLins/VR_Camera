/**
 * 职责:照片生成 3D 异步任务状态机——状态枚举/合法迁移表/迁移校验纯函数
 * 关联需求:FR-04;关联任务:PKG-14(生成网关);状态图来源:tech-stack.md §7.1 mermaid
 * 说明:Prisma enum GenTaskStatus(见 packages/database)与本枚举字面值一一对应,
 *       修改任一侧必须同步另一侧并在 dev-log 登记。
 */

export enum GenTaskStatus {
  /** 已创建并扣 Token(账本同事务) */
  DEDUCTED = 'DEDUCTED',
  /** 供应商受理,已拿到 providerTaskId */
  SUBMITTED = 'SUBMITTED',
  /** 首次进度事件后 */
  GENERATING = 'GENERATING',
  /** 成功:产物已转存 OSS,照片已删 */
  COMPLETED = 'COMPLETED',
  /** 失败:全额退 Token,照片已删 */
  FAILED = 'FAILED',
  /** 用户取消:按进度比例退款 */
  CANCELLED = 'CANCELLED',
  /** 提交失败/排队超时:全额退 */
  REFUNDED_ALL = 'REFUNDED_ALL'
}

/** 终态集合(到达后不再迁移) */
export const GEN_TASK_TERMINAL_STATES: ReadonlySet<GenTaskStatus> = new Set([
  GenTaskStatus.COMPLETED,
  GenTaskStatus.FAILED,
  GenTaskStatus.CANCELLED,
  GenTaskStatus.REFUNDED_ALL
]);

/** 合法迁移表:键=当前态,值=可进入的下一态集合(来源 tech-stack.md §7.1 状态图) */
export const GEN_TASK_TRANSITIONS: Readonly<Record<GenTaskStatus, readonly GenTaskStatus[]>> = Object.freeze({
  [GenTaskStatus.DEDUCTED]: [GenTaskStatus.SUBMITTED, GenTaskStatus.REFUNDED_ALL],
  [GenTaskStatus.SUBMITTED]: [GenTaskStatus.GENERATING, GenTaskStatus.FAILED, GenTaskStatus.REFUNDED_ALL],
  [GenTaskStatus.GENERATING]: [
    GenTaskStatus.COMPLETED,
    GenTaskStatus.FAILED,
    GenTaskStatus.CANCELLED
  ],
  [GenTaskStatus.COMPLETED]: [],
  [GenTaskStatus.FAILED]: [],
  [GenTaskStatus.CANCELLED]: [],
  [GenTaskStatus.REFUNDED_ALL]: []
});

/** 纯函数:from → to 是否为合法迁移(供 service 层守卫与单测使用) */
export function canTransition(from: GenTaskStatus, to: GenTaskStatus): boolean {
  return GEN_TASK_TRANSITIONS[from].includes(to);
}

/** 纯函数:断言迁移合法,非法时返回错误消息(不抛异常,便于服务层转 BizException) */
export function assertTransition(from: GenTaskStatus, to: GenTaskStatus): string | null {
  if (canTransition(from, to)) return null;
  return `非法状态迁移: ${from} → ${to}`;
}
