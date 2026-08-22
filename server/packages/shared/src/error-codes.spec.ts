/**
 * 职责:错误码 → HTTP 状态映射单测(全局异常过滤器依赖此映射,改分段规则必过此测)
 * 关联任务:PKG-02
 */
import { AppErrorCode, httpStatusFor } from './error-codes';

describe('httpStatusFor', () => {
  it.each([
    [AppErrorCode.INVALID_PARAM, 400],
    [AppErrorCode.UNAUTHENTICATED, 401],
    [AppErrorCode.PRIVATE_CONTENT_DENIED, 403],
    [AppErrorCode.ANCHOR_NOT_FOUND, 404],
    [AppErrorCode.INSUFFICIENT_TOKEN, 409],
    [AppErrorCode.INTERNAL, 500]
  ])('%s → %s', (code, status) => {
    expect(httpStatusFor(code)).toBe(status);
  });

  it('未注册的未知码回落 500', () => {
    expect(httpStatusFor(99999 as AppErrorCode)).toBe(500);
  });
});
