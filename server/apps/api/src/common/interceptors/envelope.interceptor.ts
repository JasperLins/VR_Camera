/**
 * 职责:全局信封拦截器——成功响应统一包装 {code:0,message:'ok',data,requestId},
 *       并附带访问日志(方法/路径/耗时)与 x-request-id 透传(客户端可传,服务端兜底生成)
 * 关联任务:PKG-02;契约见 CONVENTIONS.md §4.1
 * 例外:@SkipEnvelope() 标注的路由(SSE 流等逐帧协议)原样放行,不做包装与日志
 */
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { map, Observable, tap } from 'rxjs';

export const SKIP_ENVELOPE_META = 'skipEnvelope';

/** 跳过信封包装(SSE 等流式路由必须标注,否则逐帧包 envelope 且 headers 已发出不可再设) */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_META, true);

@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, unknown> {
  private readonly logger = new Logger('Http');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const skip =
      this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_META, [
        context.getHandler(),
        context.getClass()
      ]) === true;
    if (skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 请求 ID:客户端透传优先,否则生成(贯穿日志与响应体,便于排障)
    const requestId: string = request.headers?.['x-request-id'] || randomUUID();
    request.requestId = requestId;
    if (!response.headersSent) {
      response.setHeader?.('x-request-id', requestId);
    }

    const startedAt = Date.now();
    return next.handle().pipe(
      map((data) => ({ code: 0, message: 'ok', data: data ?? null, requestId })),
      tap({
        complete: () => this.logger.log(`${request.method} ${request.url} ${Date.now() - startedAt}ms [${requestId}]`)
      })
    );
  }
}
