/**
 * 职责:@CurrentUser() 参数装饰器——从 req.user 取字段,controller 不直接碰 request
 * 关联任务:PKG-08;用法:@CurrentUser('sub') userId / @CurrentUser() user
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return field ? request.user?.[field] : request.user;
  }
);
