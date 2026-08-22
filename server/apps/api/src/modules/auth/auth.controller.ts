/**
 * 职责:认证路由——POST /v1/auth/guest、POST /v1/auth/wechat、GET /v1/auth/me
 * 关联需求:FR-07;关联任务:PKG-08(L-5)
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { AuthService, AuthResult } from './auth.service';
import { GuestLoginDto, WechatLoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '@vrm/database';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest')
  @ApiOperation({ summary: '游客登录(浏览态,D-030);新用户自动注册赠送 80 Token' })
  async guest(@Body() dto: GuestLoginDto): Promise<AuthResult> {
    return this.authService.guestLogin(dto.deviceId);
  }

  @Post('wechat')
  @ApiOperation({ summary: '微信登录(code 换 openid;未配置资质时返回 50001 明确提示)' })
  async wechat(@Body() dto: WechatLoginDto): Promise<AuthResult> {
    return this.authService.wechatLogin(dto.code, dto.deviceId);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '当前用户信息(会话有效性探测)' })
  async me(@CurrentUser() user: User): Promise<Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'role'>> {
    return { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl, role: user.role };
  }
}
