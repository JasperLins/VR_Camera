/**
 * 职责:管理员守卫——JWT 会话基础上叠加 role=ADMIN 校验(RBAC,U-1)
 * 关联任务:PKG-22(T21);用法:@UseGuards(JwtAuthGuard, AdminGuard)
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppErrorCode } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;
    if (role !== 'ADMIN') {
      throw BizException.of(AppErrorCode.FORBIDDEN, '需要管理员权限');
    }
    return true;
  }
}
