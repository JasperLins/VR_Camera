/**
 * 职责:业务异常基类——业务代码只抛本异常(code 取 AppErrorCode),HTTP 状态由映射自动决定
 * 关联任务:PKG-02;用法:BizException.of(AppErrorCode.INSUFFICIENT_TOKEN, 'Token 余额不足')
 */
import { HttpException } from '@nestjs/common';
import { AppErrorCode, httpStatusFor } from '@vrm/shared';

export class BizException extends HttpException {
  readonly bizCode: AppErrorCode;

  private constructor(bizCode: AppErrorCode, message: string, httpStatus: number) {
    super(message, httpStatus);
    this.bizCode = bizCode;
  }

  /** 工厂方法:按错误码自动映射 HTTP 状态(CONVENTIONS.md §4.1 分段) */
  static of(code: AppErrorCode, message: string): BizException {
    return new BizException(code, message, httpStatusFor(code));
  }
}
