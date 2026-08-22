/**
 * 职责:生命周期到期扫描——VISIBLE 且 expires_at 已过的锚点批量转 HIDDEN(数据保留,重开恢复原位)
 * 关联需求:FR-06;关联任务:PKG-20(N-2/T16);扫描走 anchors_visible_expires_part 部分索引
 * 留痕:每轮扫描输出结构化日志(扫描时间/命中数);后台看板接入时可换写事件表
 */
import { Logger } from '@nestjs/common';
import type { Worker as BullWorker } from 'bullmq';
import { Worker } from 'bullmq';
import type IORedis from 'ioredis';
import type { PrismaClient } from '@vrm/database';
import { QUEUE } from '@vrm/shared';

const logger = new Logger('LifecycleScanWorker');

/** 单轮扫描:到期锚点 VISIBLE→HIDDEN(条件更新天然幂等,重复扫描零副作用) */
export async function scanExpiredAnchors(prisma: PrismaClient): Promise<{ hidden: number; scannedAt: string }> {
  const scannedAt = new Date().toISOString();
  const result = await prisma.anchor.updateMany({
    where: { status: 'VISIBLE', expiresAt: { lte: new Date() } },
    data: { status: 'HIDDEN' }
  });
  if (result.count > 0) {
    logger.log(`lifecycle scan: ${result.count} anchor(s) expired -> HIDDEN [${scannedAt}]`);
  }
  return { hidden: result.count, scannedAt };
}

export function createLifecycleScanWorker(connection: IORedis, prisma: PrismaClient): BullWorker {
  return new Worker(
    QUEUE.LIFECYCLE_SCAN,
    async () => scanExpiredAnchors(prisma),
    { connection, concurrency: 1 }
  );
}
