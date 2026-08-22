/**
 * 职责:生成任务路由——创建(扣 60 Token)/详情(轮询兜底)/取消(比例退款)
 * 关联需求:FR-04;关联任务:PKG-14(T9);进度推送走 SSE /v1/tasks/:id/events(PKG-08 已交付)
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@vrm/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGenTaskDto } from './dto/generation.dto';
import { GenerationService } from './generation.service';

@ApiTags('generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gen/tasks')
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @Post()
  @ApiOperation({ summary: '创建照片→3D 生成任务(扣 60 Token,同事务;进度经 SSE 推送)' })
  async create(@CurrentUser() user: User, @Body() dto: CreateGenTaskDto) {
    const { task, balanceAfter } = await this.generation.create(user.id, {
      photoOssKey: dto.photoOssKey,
      tags: {
        style: dto.tags.style as never,
        material: dto.tags.material as never,
        texture: dto.tags.texture as never,
        addons: dto.tags.addons as never
      }
    });
    return { taskId: task.id, status: task.status, balanceAfter };
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情(SSE 断线时的轮询兜底)' })
  async get(@CurrentUser() user: User, @Param('id') id: string) {
    const task = await this.generation.getTask(user.id, id);
    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      photoOssKey: task.photoOssKey,
      glbOssKey: task.glbOssKey,
      errorCode: task.errorCode,
      refundToken: task.refundToken,
      aiGenerated: true,
      createdAt: task.createdAt
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务(仅 GENERATING;按进度比例退款:80% 进度退 20%)' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    const { task, refundToken } = await this.generation.cancel(user.id, id);
    return { taskId: task.id, status: task.status, refundToken };
  }
}
