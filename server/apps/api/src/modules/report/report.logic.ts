/**
 * 职责:举报工单纯逻辑——状态机(受理→复核→处置)/48h SLA 截止计算/重复举报判定
 * 关联需求:FR-12;关联任务:PKG-17(Q-5/T11);口径:UX S29 + U-3 后台工单页
 */

export enum ReportStatusValue {
  RECEIVED = 'RECEIVED',
  REVIEWING = 'REVIEWING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

export const REPORT_TERMINAL_STATES: ReadonlySet<ReportStatusValue> = new Set([
  ReportStatusValue.RESOLVED,
  ReportStatusValue.DISMISSED
]);

/** 合法迁移:RECEIVED→复核/直接处置;REVIEWING→处置;终态封闭 */
export const REPORT_TRANSITIONS: Readonly<Record<ReportStatusValue, readonly ReportStatusValue[]>> = Object.freeze({
  [ReportStatusValue.RECEIVED]: [ReportStatusValue.REVIEWING, ReportStatusValue.RESOLVED, ReportStatusValue.DISMISSED],
  [ReportStatusValue.REVIEWING]: [ReportStatusValue.RESOLVED, ReportStatusValue.DISMISSED],
  [ReportStatusValue.RESOLVED]: [],
  [ReportStatusValue.DISMISSED]: []
});

export function canReportTransition(from: ReportStatusValue, to: ReportStatusValue): boolean {
  return REPORT_TRANSITIONS[from].includes(to);
}

/** 48h 人工复核 SLA 截止(FR-12 一句线:举报后 48h 内进入人工复核) */
export const REPORT_SLA_HOURS = 48;

export function slaDeadlineFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + REPORT_SLA_HOURS * 3600 * 1000);
}

/** SLA 是否已超时(后台 U-3 预警列) */
export function isSlaBreached(now: Date, slaDeadline: Date, status: ReportStatusValue): boolean {
  if (!REPORT_TERMINAL_STATES.has(status)) {
    return now > slaDeadline;
  }
  return false;
}
