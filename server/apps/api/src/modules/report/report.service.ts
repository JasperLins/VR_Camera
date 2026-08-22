/**
 * 职责:举报服务——提交(文本过机审+对象摘要快照+重复举报去重)/我的举报列表
 * 关联需求:FR-12;关联任务:PKG-17(Q-5/T11);处置流转(复核/结单)在 admin 端点(T21)
 */
import { Injectable } from '@nestjs/common';
import { ModerationScene, ModerationVerdict, Report, ReportReason, ReportStatus, ReportTargetType } from '@vrm/database';
import { AppErrorCode } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentSafetyService } from '../safety/content-safety.service';
import { isSlaBreached, slaDeadlineFrom } from './report.logic';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: ContentSafetyService
  ) {}

  /** 提交举报:48h SLA 起算;补充说明过机审(违规词命中→拒绝提交,进人工的黑话留给 MARK_REVIEW) */
  async create(
    reporterId: string,
    input: { targetType: ReportTargetType; targetId: string; reason: ReportReason; note?: string }
  ): Promise<{ report: Report; duplicated: boolean }> {
    // 重复举报:同一举报人对同一对象存在未结单 → 返回既有工单(UX:重复举报提示)
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: { in: [ReportStatus.RECEIVED, ReportStatus.REVIEWING] }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return { report: existing, duplicated: true };
    }

    let verdict: ModerationVerdict = ModerationVerdict.PASS;
    if (input.note && input.note.trim()) {
      const check = await this.safety.checkText(
        ModerationScene.REPORT_TEXT,
        'report-draft',
        reporterId,
        input.note
      );
      verdict = check.verdict;
      if (verdict === ModerationVerdict.REJECT) {
        throw BizException.of(AppErrorCode.INVALID_PARAM, '补充说明含违规内容,请修改后提交');
      }
    }

    const targetSummary = await this.summarizeTarget(input.targetType, input.targetId);
    const now = new Date();
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        targetSummary,
        reason: input.reason,
        note: input.note,
        status: ReportStatus.RECEIVED,
        slaDeadline: slaDeadlineFrom(now)
      }
    });
    return { report, duplicated: false };
  }

  /** 我的举报分页(含 SLA 状态视图字段) */
  async listMine(reporterId: string, page: number, pageSize: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where: { reporterId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.report.count({ where: { reporterId } })
    ]);
    return {
      items: items.map((r) => this.toView(r)),
      total,
      page,
      pageSize
    };
  }

  /** admin 侧:工单列表/流转(T21 接线) */
  async listAll(status: ReportStatus | undefined, page: number, pageSize: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where: status ? { status } : undefined,
        orderBy: { slaDeadline: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.report.count({ where: status ? { status } : undefined })
    ]);
    return { items: items.map((r) => this.toView(r)), total, page, pageSize };
  }

  async transition(
    reportId: string,
    to: ReportStatus,
    handledById: string,
    resolution?: string
  ): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw BizException.of(AppErrorCode.NOT_FOUND, '举报工单不存在');
    }
    const { canReportTransition } = await import('./report.logic');
    if (!canReportTransition(report.status as never, to)) {
      throw BizException.of(AppErrorCode.ILLEGAL_TASK_TRANSITION, `举报工单非法流转: ${report.status} → ${to}`);
    }
    const terminal = to === ReportStatus.RESOLVED || to === ReportStatus.DISMISSED;
    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: to,
        handledById,
        resolution,
        resolvedAt: terminal ? new Date() : null
      }
    });
  }

  private toView(r: Report) {
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      targetSummary: r.targetSummary,
      reason: r.reason,
      note: r.note,
      status: r.status,
      slaDeadline: r.slaDeadline,
      slaBreached: isSlaBreached(new Date(), r.slaDeadline, r.status as never),
      resolution: r.resolution,
      createdAt: r.createdAt
    };
  }

  /** 举报对象摘要快照(防对象事后变更;锚点取标题,其余取类型+id) */
  private async summarizeTarget(targetType: ReportTargetType, targetId: string): Promise<string> {
    if (targetType === ReportTargetType.ANCHOR) {
      const anchor = await this.prisma.anchor.findUnique({
        where: { id: targetId },
        select: { title: true, status: true }
      });
      if (anchor) {
        return `锚点「${anchor.title}」(${anchor.status})`;
      }
    }
    if (targetType === ReportTargetType.GEN_TASK) {
      const task = await this.prisma.genTask.findUnique({ where: { id: targetId }, select: { id: true } });
      if (task) {
        return `生成任务 ${task.id.slice(0, 8)}…`;
      }
    }
    return `${targetType}:${targetId}`;
  }
}
