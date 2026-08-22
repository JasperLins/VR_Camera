/**
 * 职责:举报工单纯逻辑单测——状态机/SLA 计算(T11 验收:状态机单测)
 */
import {
  canReportTransition,
  isSlaBreached,
  REPORT_SLA_HOURS,
  ReportStatusValue,
  slaDeadlineFrom
} from './report.logic';

describe('report.logic', () => {
  it('合法流转:受理→复核→处置;非法跳跃与终态外流被拒', () => {
    expect(canReportTransition(ReportStatusValue.RECEIVED, ReportStatusValue.REVIEWING)).toBe(true);
    expect(canReportTransition(ReportStatusValue.RECEIVED, ReportStatusValue.RESOLVED)).toBe(true);
    expect(canReportTransition(ReportStatusValue.REVIEWING, ReportStatusValue.DISMISSED)).toBe(true);
    expect(canReportTransition(ReportStatusValue.RESOLVED, ReportStatusValue.REVIEWING)).toBe(false);
    expect(canReportTransition(ReportStatusValue.DISMISSED, ReportStatusValue.RESOLVED)).toBe(false);
  });

  it('SLA 截止 = 提交时间 + 48h', () => {
    const created = new Date('2026-08-23T10:00:00Z');
    const deadline = slaDeadlineFrom(created);
    expect((deadline.getTime() - created.getTime()) / 3_600_000).toBe(REPORT_SLA_HOURS);
  });

  it('SLA 超时判定:未结单且过线才超;结单后不再计', () => {
    const created = new Date('2026-08-23T10:00:00Z');
    const deadline = slaDeadlineFrom(created);
    expect(isSlaBreached(new Date('2026-08-25T10:00:01Z'), deadline, ReportStatusValue.RECEIVED)).toBe(true);
    expect(isSlaBreached(new Date('2026-08-23T11:00:00Z'), deadline, ReportStatusValue.RECEIVED)).toBe(false);
    expect(isSlaBreached(new Date('2026-08-30T00:00:00Z'), deadline, ReportStatusValue.RESOLVED)).toBe(false);
  });
});
