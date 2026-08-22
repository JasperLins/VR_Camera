/**
 * 职责:全局异常过滤器——BizException/HttpException/未知异常统一转业务错误信封并记录日志
 * 关联任务:PKG-02;输出契约:{code:AppErrorCode, message, data:null, requestId}
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { AppErrorCode } from '@vrm/shared';
import { randomUUID } from 'crypto';
import { BizException } from '../biz.exception';

/** HTTP 状态 → 兜底业务码(框架层异常无业务码时按状态落段) */
function fallbackCodeByStatus(status: number): AppErrorCode {
  switch (true) {
    case status === 400:
      return AppErrorCode.INVALID_PARAM;
    case status === 401:
      return AppErrorCode.UNAUTHENTICATED;
    case status === 403:
      return AppErrorCode.FORBIDDEN;
    case status === 404:
      return AppErrorCode.NOT_FOUND;
    case status === 409:
      return AppErrorCode.STATE_CONFLICT;
    case status === 429:
      return AppErrorCode.RATE_LIMITED;
    default:
      return AppErrorCode.INTERNAL;
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let code: AppErrorCode = AppErrorCode.INTERNAL;
    let message = '服务内部错误,请稍后重试';

    if (exception instanceof BizException) {
      // 业务异常:精确业务码 + HTTP 状态(BizException 构造时已按分段映射)
      status = exception.getStatus();
      code = exception.bizCode;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      // class-validator 聚合错误体 {statusCode, message: string[]|string, error}
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object' && 'message' in payload) {
        const m = (payload as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join('; ') : m;
      }
      // 框架层异常(参数校验/路由不存在等)按 HTTP 状态分段兜底
      code = fallbackCodeByStatus(status);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`unhandled: ${exception.stack ?? message}`);
    }

    const requestId = (request.requestId as string | undefined) ?? randomUUID();
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status} [${requestId}] ${message}`);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} [${requestId}] ${message}`);
    }

    // SSE 等流式响应 headers 已发出:只能记录,不可再写 HTTP 状态(否则二次抛错)
    if (response.headersSent) {
      this.logger.warn(`headers already sent, drop error body [${requestId}] ${message}`);
      return;
    }
    response.status(status).json({ code, message, data: null, requestId });
  }
}
