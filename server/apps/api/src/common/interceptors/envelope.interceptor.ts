/**
 * 职责:全局信封拦截器——成功响应统一包装 {code:0,message:'ok',data,requestId},
 *       并附带访问日志(方法/路径/耗时)与 x-request-id 透传(客户端可传,服务端兜底生成)
 * 关联任务:PKG-02;契约见 CONVENTIONS.md §4.1
 */
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { map, Observable, tap } from 'rxjs';

@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, unknown> {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 请求 ID:客户端透传优先,否则生成(贯穿日志与响应体,便于排障)
    const requestId: string = request.headers?.['x-request-id'] || randomUUID();
    request.requestId = requestId;
    response.setHeader?.('x-request-id', requestId);

    const startedAt = Date.now();
    return next.handle().pipe(
      map((data) => ({ code: 0, message: 'ok', data: data ?? null, requestId })),
      tap({
        complete: () => this.logger.log(`${request.method} ${request.url} ${Date.now() - startedAt}ms [${requestId}]`)
      })
    );
  }
}
