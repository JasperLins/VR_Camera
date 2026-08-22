/**
 * 职责:worker 侧结构性依赖类型——生成处理器/退款扫描的注入面(最小接口,便于桩测)
 * 关联任务:PKG-14(T8);运行期实现=PrismaClient + api 同款 TokenService 语义
 */
import type { GenTaskStatusDb, LedgerReason } from '@vrm/database';

/** 生成任务行的 worker 视图(processor 只读写这些字段) */
export interface WorkerGenTask {
  id: string;
  userId: string;
  status: GenTaskStatusDb;
  providerTaskId: string | null;
  photoOssKey: string | null;
  params: unknown;
  progress: number;
  createdAt: Date;
  /** 终态结果字段(更新后出现) */
  glbOssKey?: string | null;
  errorCode?: string | null;
  refundToken?: number;
}

/** Token 入账注入面(与 api TokenService.credit 兼容的子集) */
export interface WorkerTokenService {
  credit(
    userId: string,
    amount: number,
    reason: LedgerReason,
    idempotencyKey: string,
    refId?: string
  ): Promise<{ created: boolean; balanceAfter: number; entryId: string }>;
}

/** Prisma 注入面(单测桩实现该子集即可) */
export interface WorkerPrisma {
  genTask: {
    findUnique(args: { where: { id: string } }): Promise<WorkerGenTask | null>;
    findMany(args: { where: unknown; take?: number }): Promise<WorkerGenTask[]>;
    updateMany(args: { where: unknown; data: unknown }): Promise<{ count: number }>;
  };
}
