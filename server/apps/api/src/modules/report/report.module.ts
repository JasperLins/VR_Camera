/**
 * 职责:举报模块装配(PKG-17 Q-5)
 */
import { Module } from '@nestjs/common';
import { SafetyModule } from '../safety/safety.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [SafetyModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService]
})
export class ReportModule {}
