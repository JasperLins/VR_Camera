/**
 * 职责:SSE 路由——GET /v1/tasks/:taskId/events(生成进度推送,FR-04)
 * 关联任务:PKG-08(L-6)+ PKG-14(消费);客户端断开自动清理 Redis 订阅
 */
import { Controller, Param, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SseMessage, SseService, taskChannel } from './sse.service';

@ApiTags('sse')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse(':taskId/events')
  @ApiOperation({ summary: '订阅生成任务进度(SSE;断线后客户端轮询 GET /v1/tasks/:id 兜底)' })
  events(@Param('taskId') taskId: string, @Req() request: Request): Observable<SseMessage> {
    return this.sseService.stream(taskChannel(taskId), () => {
      request.emit('close'); // 触达框架侧连接清理
    });
  }
}
