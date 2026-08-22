/**
 * 职责:积分模块装配(PKG-18 P-3)
 */
import { Module } from '@nestjs/common';
import { PointsService } from './points.service';

@Module({
  providers: [PointsService],
  exports: [PointsService]
})
export class PointsModule {}
