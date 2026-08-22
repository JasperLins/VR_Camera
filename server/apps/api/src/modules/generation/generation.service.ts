/**
 * 职责:生成网关服务——任务创建(扣 60 Token 同事务/幂等 gen-debit:taskId)、状态查询(轮询兜底)、
 *       用户取消(按进度比例退款 computeCancelRefund)
 * 关联需求:FR-04;关联任务:PKG-14(O-1/T7 + T9);决策:D-047 生成价 60 / A-405 余额权威
 * 状态机:迁移合法性统一走 @vrm/shared canTransition,非法迁移抛 ILLEGAL_TASK_TRANSITION
 */
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GenTask, LedgerReason } from '@vrm/database';
import {
  AppErrorCode,
  canTransition,
  GenTaskStatus,
  GenTags,
  GEN_TASK_TERMINAL_STATES,
  mapTagsToParams,
  TOKEN_ECONOMY,
  validateGenTags
} from '@vrm/shared';
import type { Queue } from 'bullmq';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildIdempotencyKey, computeCancelRefund, IdempotencyKind } from '../ledger/ledger.logic';
import { TokenService } from '../ledger/token.service';

export const GENERATION_QUEUE = Symbol('GENERATION_QUEUE');

export interface CreateGenTaskInput {
  photoOssKey?: string;
  tags: GenTags;
}

@Injectable()
export class GenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly token: TokenService,
    @Inject(GENERATION_QUEUE) private readonly queue: Queue
  ) {}

  /**
   * 创建生成任务:扣 Token 与建任务同一事务(余额不足时任务不留痕);
   * 提交队列在事务提交后进行(入队失败任务停留 DEDUCTED,由 worker 超时扫描 REFUNDED_ALL 兜底)。
   */
  async create(userId: string, input: CreateGenTaskInput): Promise<{ task: GenTask; balanceAfter: number }> {
    const tagError = validateGenTags(input.tags);
    if (tagError) {
      throw BizException.of(AppErrorCode.INVALID_PARAM, tagError);
    }

    const taskId = randomUUID();
    const params = mapTagsToParams(input.tags);

    const { balanceAfter } = await this.prisma.$transaction(async (tx) => {
      const result = await this.token.debit(
        userId,
        TOKEN_ECONOMY.GENERATION_COST,
        LedgerReason.GENERATION_DEBIT,
        buildIdempotencyKey(IdempotencyKind.GEN_DEBIT, taskId),
        taskId,
        tx
      );
      await tx.genTask.create({
        data: {
          id: taskId,
          userId,
          status: GenTaskStatus.DEDUCTED,
          photoOssKey: input.photoOssKey ?? null,
          params: params as unknown as object
        }
      });
      return { balanceAfter: result.balanceAfter };
    });

    const task = await this.prisma.genTask.findUniqueOrThrow({ where: { id: taskId } });
    await this.queue.add('generate', { taskId }, { jobId: taskId, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    return { task, balanceAfter };
  }

  /** 任务详情(轮询兜底端点;owner 校验,他人任务 404 口径防枚举) */
  async getTask(userId: string, taskId: string): Promise<GenTask> {
    const task = await this.prisma.genTask.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      throw BizException.of(AppErrorCode.TASK_NOT_FOUND, '生成任务不存在');
    }
    return task;
  }

  /** 用户取消:仅 GENERATING 可取消(进度比例退款);终态/未受理态拒绝 */
  async cancel(userId: string, taskId: string): Promise<{ task: GenTask; refundToken: number }> {
    const task = await this.getTask(userId, taskId);
    if (!canTransition(task.status as GenTaskStatus, GenTaskStatus.CANCELLED)) {
      throw BizException.of(
        AppErrorCode.ILLEGAL_TASK_TRANSITION,
        GEN_TASK_TERMINAL_STATES.has(task.status as GenTaskStatus)
          ? `任务已终态(${task.status}),不可取消`
          : `当前状态 ${task.status} 不可取消(仅 GENERATING 可取消)`
      );
    }

    const refund = computeCancelRefund(TOKEN_ECONOMY.GENERATION_COST, task.progress);
    await this.prisma.$transaction(async (tx) => {
      // 条件更新防并发迁移:status 仍为可取消态才落 CANCELLED
      const updated = await tx.genTask.updateMany({
        where: { id: taskId, status: task.status },
        data: { status: GenTaskStatus.CANCELLED, refundToken: refund }
      });
      if (updated.count === 0) {
        throw BizException.of(AppErrorCode.ILLEGAL_TASK_TRANSITION, '任务状态已变化,取消失败(并发)');
      }
      if (refund > 0) {
        await this.token.credit(
          userId,
          refund,
          LedgerReason.GENERATION_REFUND_PARTIAL,
          buildIdempotencyKey(IdempotencyKind.GEN_REFUND_CANCEL, taskId),
          taskId,
          tx
        );
      }
    });

    return { task: await this.getTask(userId, taskId), refundToken: refund };
  }
}
