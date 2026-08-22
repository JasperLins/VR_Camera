/**
 * 职责:地理模块装配(PKG-10)
 */
import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService]
})
export class GeoModule {}
