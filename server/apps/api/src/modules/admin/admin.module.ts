/**
 * 职责:管理后台模块装配(PKG-22 T21)
 */
import { Module } from '@nestjs/common';
import { ReportModule } from '../report/report.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ReportModule],
  controllers: [AdminController]
})
export class AdminModule {}
