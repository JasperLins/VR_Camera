/**
 * 职责:打卡模块装配(PKG-18 S-1)
 */
import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';

@Module({
  imports: [PointsModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService]
})
export class CheckinModule {}
