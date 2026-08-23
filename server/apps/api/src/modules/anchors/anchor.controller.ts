/**
 * 职责:锚点路由——放置/详情/我的三态管理/隐藏/重开/删除/授权/口令(PKG-16/15,T14/T15)
 * 关联需求:FR-03/FR-06;坐标出入参一律 WGS84(D-006)
 */
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';
import { AnchorContentType, AnchorStatus, AnchorVisibility, User } from '@vrm/database';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Anchor } from '@vrm/database';
import { EXPIRY_VALUES } from './anchor.logic';
import { AnchorListResult, AnchorService, AnchorWithRecycle } from './anchor.service';

class PlaceAnchorDto {
  @IsString()
  @MaxLength(50)
  title!: string;

  @IsIn(['MODEL', 'IMAGE', 'TEXT'])
  contentType!: AnchorContentType;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  contentRef?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsNumber()
  altitude!: number;

  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility!: AnchorVisibility;

  @IsIn(EXPIRY_VALUES as unknown as string[])
  expiry!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  aiGenerated?: boolean;
}

class GrantDto {
  @IsUUID()
  granteeId!: string;
}

class PasscodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  token!: string;
}

class ReopenDto {
  @IsOptional()
  @IsIn(EXPIRY_VALUES as unknown as string[])
  expiry?: string;
}

class MyListQueryDto extends PaginationDto {
  @IsIn(['VISIBLE', 'HIDDEN', 'DELETED'])
  status!: AnchorStatus;
}

@ApiTags('anchors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('anchors')
export class AnchorController {
  constructor(private readonly anchors: AnchorService) {}

  @Post()
  @ApiOperation({ summary: '放置内容(WGS84+海拔落库即刻可见;私密仅授权可见;标题机审)' })
  async place(@CurrentUser() user: User, @Body() dto: PlaceAnchorDto): Promise<Anchor> {
    return this.anchors.place(user.id, {
      title: dto.title,
      contentType: dto.contentType,
      contentRef: dto.contentRef,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude,
      visibility: dto.visibility,
      expiry: dto.expiry as never,
      aiGenerated: dto.aiGenerated
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '内容详情(私密需授权/口令;含 aiGenerated 标识 R-4)' })
  async detail(@CurrentUser() user: User, @Param('id') id: string): Promise<AnchorWithRecycle> {
    return this.anchors.getDetail(user.id, id);
  }

  @Get()
  @ApiOperation({ summary: '我的内容三态列表(VISIBLE/HIDDEN/DELETED,回收站含 30 天倒计时)' })
  async mine(@CurrentUser() user: User, @Query() query: MyListQueryDto): Promise<AnchorListResult> {
    return this.anchors.listMine(user.id, query.status, query.page, query.pageSize);
  }

  @Post(':id/hide')
  @ApiOperation({ summary: '隐藏(数据保留,取景框消失)' })
  async hide(@CurrentUser() user: User, @Param('id') id: string): Promise<Anchor> {
    return this.anchors.hide(user.id, id);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: '重开(恢复原坐标原状态;回收期内恢复为 HIDDEN)' })
  async reopen(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ReopenDto): Promise<Anchor> {
    return this.anchors.reopen(user.id, id, dto.expiry as never);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除(软删,30 天回收期内可恢复)' })
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<Anchor> {
    return this.anchors.remove(user.id, id);
  }

  @Post(':id/grants')
  @ApiOperation({ summary: '追加授权好友(移除后对方重新上锁)' })
  async grant(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: GrantDto) {
    await this.anchors.grant(user.id, id, dto.granteeId);
    return { granted: true };
  }

  @Delete(':id/grants/:granteeId')
  @ApiOperation({ summary: '移除授权(对方取景框重新上锁消失)' })
  async revoke(@CurrentUser() user: User, @Param('id') id: string, @Param('granteeId') granteeId: string) {
    await this.anchors.revoke(user.id, id, granteeId);
    return { revoked: true };
  }

  @Post(':id/passcode')
  @ApiOperation({ summary: '生成口令(明文仅本次返回;旧口令作废)' })
  async createPasscode(@CurrentUser() user: User, @Param('id') id: string) {
    return this.anchors.createPasscode(user.id, id);
  }

  @Post(':id/passcode/verify')
  @ApiOperation({ summary: '口令校验(通过获得 24h 可见;5 次失败冷却 10 分钟)' })
  async verifyPasscode(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: PasscodeDto) {
    return this.anchors.verifyPasscode(user.id, id, dto.token);
  }
}
