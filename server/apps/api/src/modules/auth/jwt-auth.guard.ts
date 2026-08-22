/**
 * 职责:JWT 守卫——校验 Bearer 会话并挂载 req.user(受保护路由统一 @UseGuards(JwtAuthGuard))
 * 关联任务:PKG-08(L-5 会话管理);不引入 passport,保持依赖最小
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppErrorCode } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw BizException.of(AppErrorCode.UNAUTHENTICATED, '未登录(缺少 Bearer 会话)');
    }

    try {
      const payload = await this.jwt.verifyAsync(header.slice('Bearer '.length));
      request.user = await this.authService.validateTokenPayload(payload);
      return true;
    } catch (err) {
      if (err instanceof BizException) {
        throw err;
      }
      throw BizException.of(AppErrorCode.TOKEN_EXPIRED, '会话已过期,请重新登录');
    }
  }
}
