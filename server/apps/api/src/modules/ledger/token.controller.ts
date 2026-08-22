/**
 * 职责:账本路由——余额/流水查询(写操作不对外,由生成等业务模块在服务端内部调用)
 * 关联需求:FR-07(K-1 余额常驻/K-4 流水明细);关联任务:PKG-13 + PKG-21(K-1/K-4)
 * 红线:一期无充值入口(D-023),本控制器不提供任何购买/充值路由
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@vrm/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TokenService } from './token.service';

@ApiTags('ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ledger')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Token 余额(权威值,客户端仅展示缓存,A-405)' })
  async balance(@CurrentUser() user: User): Promise<{ balance: number }> {
    return { balance: await this.tokenService.getBalance(user.id) };
  }

  @Get('entries')
  @ApiOperation({ summary: 'Token 流水分页(时间倒序)' })
  async entries(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto
  ): Promise<{ items: unknown[]; total: number; page: number; pageSize: number }> {
    return this.tokenService.listEntries(user.id, pagination.page, pagination.pageSize);
  }
}
