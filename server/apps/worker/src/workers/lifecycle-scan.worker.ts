/**
 * 职责:生命周期到期扫描 Worker(占位骨架)——按锚点 expires_at 批量隐藏到期内容
 * 关联需求:FR-06;关联任务:PKG-20(N-2,B3 批次实现真实逻辑:
 *   扫描 anchors_visible_expires_part 部分索引 → 到期行置 HIDDEN → 事件留痕)
 * 说明:prisma 连接已注入(B3 实现时直接使用);当前仅保留占位 tick。
 */
import { Logger } from '@nestjs/common';
import type { Worker as BullWorker } from 'bullmq';
import { Worker } from 'bullmq';
import type IORedis from 'ioredis';
import type { PrismaClient } from '@vrm/database';
import { QUEUE } from '@vrm/shared';

const logger = new Logger('LifecycleScanWorker');

export function createLifecycleScanWorker(connection: IORedis, _prisma: PrismaClient): BullWorker {
  return new Worker(
    QUEUE.LIFECYCLE_SCAN,
    async () => {
      // TODO(PKG-20/B3):到期锚点批量隐藏(见文件头说明),当前仅保留占位实现
      logger.log('lifecycle scan tick (placeholder — implemented in PKG-20)');
      return { scannedAt: new Date().toISOString() };
    },
    { connection, concurrency: 1 }
  );
}
