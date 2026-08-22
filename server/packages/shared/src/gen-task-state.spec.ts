/**
 * 职责:生成任务状态机纯逻辑单测(DoD:核心纯逻辑覆盖 ≥70% 的第一块)
 * 关联任务:PKG-14 前置(PKG-02 交付测试管线样板)
 */
import {
  GEN_TASK_TERMINAL_STATES,
  GEN_TASK_TRANSITIONS,
  GenTaskStatus,
  assertTransition,
  canTransition
} from './gen-task-state';

describe('gen-task-state', () => {
  it('正常主链路迁移全部合法:DEDUCTED → SUBMITTED → GENERATING → COMPLETED', () => {
    expect(canTransition(GenTaskStatus.DEDUCTED, GenTaskStatus.SUBMITTED)).toBe(true);
    expect(canTransition(GenTaskStatus.SUBMITTED, GenTaskStatus.GENERATING)).toBe(true);
    expect(canTransition(GenTaskStatus.GENERATING, GenTaskStatus.COMPLETED)).toBe(true);
  });

  it('提交失败可全额退款:DEDUCTED → REFUNDED_ALL', () => {
    expect(canTransition(GenTaskStatus.DEDUCTED, GenTaskStatus.REFUNDED_ALL)).toBe(true);
  });

  it('生成中可取消(比例退款)与失败(全额退):GENERATING → CANCELLED / FAILED', () => {
    expect(canTransition(GenTaskStatus.GENERATING, GenTaskStatus.CANCELLED)).toBe(true);
    expect(canTransition(GenTaskStatus.GENERATING, GenTaskStatus.FAILED)).toBe(true);
  });

  it('终态不可再迁移', () => {
    for (const terminal of GEN_TASK_TERMINAL_STATES) {
      expect(GEN_TASK_TRANSITIONS[terminal]).toHaveLength(0);
    }
  });

  it('非法迁移被拒绝:DEDUCTED → COMPLETED(未提交不可能成功)', () => {
    expect(canTransition(GenTaskStatus.DEDUCTED, GenTaskStatus.COMPLETED)).toBe(false);
    expect(assertTransition(GenTaskStatus.DEDUCTED, GenTaskStatus.COMPLETED)).toContain('非法状态迁移');
  });

  it('COMPLETED 不能退回 GENERATING', () => {
    expect(canTransition(GenTaskStatus.COMPLETED, GenTaskStatus.GENERATING)).toBe(false);
    expect(assertTransition(GenTaskStatus.COMPLETED, GenTaskStatus.GENERATING)).not.toBeNull();
  });

  it('合法迁移返回 null 错误消息', () => {
    expect(assertTransition(GenTaskStatus.DEDUCTED, GenTaskStatus.SUBMITTED)).toBeNull();
  });
});
