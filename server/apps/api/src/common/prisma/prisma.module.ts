/**
 * 职责:Prisma 模块——@Global 注册 PrismaService,业务模块无需重复 import
 * 关联任务:PKG-02
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
