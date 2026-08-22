/**
 * 职责:SSE 模块装配(PKG-08 L-6)
 */
import { Module } from '@nestjs/common';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Module({
  controllers: [SseController],
  providers: [SseService]
})
export class SseModule {}
