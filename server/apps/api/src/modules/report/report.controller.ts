/**
 * 职责:举报路由——POST /v1/reports、GET /v1/reports/mine(FR-12)
 * 关联任务:PKG-17(Q-5/T11);频控:5 次/小时/人(防恶意刷举报)
 */
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReportReason, ReportTargetType } from '@vrm/database';
import { User } from '@vrm/database';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportService } from './report.service';

class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@ApiTags('report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ limit: 5, windowSeconds: 3600, scope: 'report:create' })
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: '提交举报(受理→48h 内人工复核;重复举报返回既有工单)' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    const { report, duplicated } = await this.reportService.create(user.id, dto);
    return { reportId: report.id, status: report.status, duplicated, slaDeadline: report.slaDeadline };
  }

  @Get('mine')
  @ApiOperation({ summary: '我的举报列表(含 SLA 超时标记)' })
  async mine(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.reportService.listMine(user.id, pagination.page, pagination.pageSize);
  }
}
