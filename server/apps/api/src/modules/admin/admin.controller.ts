/**
 * 职责:管理后台路由——内容管理/强制下架/举报工单处置(U-1~U-3,PKG-22 T21)
 * 关联需求:FR-12;鉴权:JWT + ADMIN 角色(演示账号见 scripts/seed-admin.ts)
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnchorStatus, ReportStatus, User } from '@vrm/database';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportService } from '../report/report.service';
import { AdminGuard } from './admin.guard';

class ReportTransitionDto {
  @IsIn(['REVIEWING', 'RESOLVED', 'DISMISSED'])
  to!: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolution?: string;
}

class AnchorListQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['VISIBLE', 'HIDDEN', 'DELETED'])
  status?: AnchorStatus;
}

/** 内容管理列表行(select 子集;显式接口满足 declaration 检查,TS2742) */
interface AdminAnchorRow {
  id: string;
  title: string;
  userId: string;
  contentType: 'MODEL' | 'IMAGE' | 'TEXT';
  visibility: 'PUBLIC' | 'PRIVATE';
  status: AnchorStatus;
  aiGenerated: boolean;
  latitude: import('@vrm/database').Prisma.Decimal;
  longitude: import('@vrm/database').Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportService
  ) {}

  @Get('anchors')
  @ApiOperation({ summary: '内容管理列表(全量锚点,按状态过滤)' })
  async anchors(
    @Query() query: AnchorListQueryDto
  ): Promise<{ items: AdminAnchorRow[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.anchor.findMany({
        where: query.status ? { status: query.status } : undefined,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
          userId: true,
          contentType: true,
          visibility: true,
          status: true,
          aiGenerated: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true
        }
      }),
      this.prisma.anchor.count({ where: query.status ? { status: query.status } : undefined })
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  @Post('anchors/:id/takedown')
  @ApiOperation({ summary: '强制下架(任意状态锚点转 HIDDEN,审核处置手段)' })
  async takedown(@Param('id') id: string) {
    const updated = await this.prisma.anchor.update({
      where: { id },
      data: { status: AnchorStatus.HIDDEN }
    });
    return { id: updated.id, status: updated.status };
  }

  @Get('reports')
  @ApiOperation({ summary: '举报工单列表(按 SLA 截止排序,含超时标记)' })
  async reportList(
    @Query() pagination: PaginationDto,
    @Query('status') status?: ReportStatus
  ) {
    return this.reports.listAll(status, pagination.page, pagination.pageSize);
  }

  @Post('reports/:id/transition')
  @ApiOperation({ summary: '工单流转(受理→复核→处置;处置需填 resolution)' })
  async reportTransition(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: ReportTransitionDto
  ) {
    const updated = await this.reports.transition(id, dto.to, admin.id, dto.resolution);
    return { id: updated.id, status: updated.status };
  }
}
