/**
 * 职责:Prisma 服务——全应用唯一 DB 客户端出口,注入各业务模块使用
 * 关联任务:PKG-02(骨架)/ PKG-08(L-2 数据基建);客户端来自 @vrm/database(禁止绕过)
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@vrm/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
