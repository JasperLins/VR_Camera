/**
 * 职责:业务错误码注册表 + HTTP 状态映射——全服务端统一错误语义唯一来源
 * 关联任务:PKG-02;分段规则见 CONVENTIONS.md §4.1
 * 40000 参数 / 40100 认证 / 40300 权限 / 40400 资源 / 40900 冲突 / 50000 服务端内部
 */

/** 业务错误码(新增错误必须在此登记,禁止模块内私造魔法数字) */
export enum AppErrorCode {
  OK = 0,
  // ---- 40000 参数 ----
  INVALID_PARAM = 40000,
  PAYLOAD_TOO_LARGE = 40001,
  // ---- 40100 认证 ----
  UNAUTHENTICATED = 40100,
  TOKEN_EXPIRED = 40101,
  // ---- 40300 权限 ----
  FORBIDDEN = 40300,
  PRIVATE_CONTENT_DENIED = 40301,
  // ---- 40400 资源 ----
  NOT_FOUND = 40400,
  ANCHOR_NOT_FOUND = 40401,
  TASK_NOT_FOUND = 40402,
  // ---- 40900 冲突 ----
  STATE_CONFLICT = 40900,
  INSUFFICIENT_TOKEN = 40901,
  DUPLICATED_IDEMPOTENCY = 40902,
  ILLEGAL_TASK_TRANSITION = 40903,
  RATE_LIMITED = 40904,
  // ---- 50000 服务端内部 ----
  INTERNAL = 50000,
  DEPENDENCY_UNAVAILABLE = 50001
}

/** 错误码分段 → HTTP 状态(40000→400 … 50000→500) */
function segmentToStatus(code: number): number {
  if (code >= 50000) return 500;
  if (code >= 40900) return 409;
  if (code >= 40400) return 404;
  if (code >= 40300) return 403;
  if (code >= 40100) return 401;
  return 400;
}

/** 错误码 → HTTP 状态码映射(全局异常过滤器按此落装,业务代码只抛 BizException) */
const HTTP_STATUS_BY_CODE: ReadonlyMap<number, number> = new Map(
  (Object.values(AppErrorCode) as number[]).map((code) => [code, segmentToStatus(code)] as const)
);

export function httpStatusFor(code: AppErrorCode): number {
  return HTTP_STATUS_BY_CODE.get(code) ?? 500;
}
