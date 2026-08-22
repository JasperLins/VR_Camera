/**
 * 职责:打卡与积分路由——POST /v1/checkins、GET /v1/points/balance|entries(FR-05/FR-08)
 * 关联任务:PKG-18(S-1 + P-3 余额接口);打卡频控 10 次/分钟/人
 */
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { User } from '@vrm/database';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PointsService } from '../points/points.service';
import { CheckinService } from './checkin.service';

class CheckinDto {
  @IsUUID()
  anchorId!: string;
}

@ApiTags('checkin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly points: PointsService
  ) {}

  @Post('checkins')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60, scope: 'checkin:report' })
  @ApiOperation({ summary: '打卡上报(+2 积分/同锚点每日首次/日上限 10;重复打卡幂等返回)' })
  async checkin(@CurrentUser() user: User, @Body() dto: CheckinDto) {
    return this.checkinService.checkin(user.id, dto.anchorId);
  }

  @Get('points/balance')
  @ApiOperation({ summary: '积分余额' })
  async balance(@CurrentUser() user: User): Promise<{ balance: number }> {
    return { balance: await this.points.getBalance(user.id) };
  }

  @Get('points/entries')
  @ApiOperation({ summary: '积分流水分页(时间倒序)' })
  async entries(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.points.listEntries(user.id, pagination.page, pagination.pageSize);
  }
}
