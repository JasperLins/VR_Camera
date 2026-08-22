/**
 * 职责:锚点模块装配(PKG-16/15)
 */
import { Module } from '@nestjs/common';
import { SafetyModule } from '../safety/safety.module';
import { AnchorController } from './anchor.controller';
import { AnchorService } from './anchor.service';

@Module({
  imports: [SafetyModule],
  controllers: [AnchorController],
  providers: [AnchorService],
  exports: [AnchorService]
})
export class AnchorsModule {}
