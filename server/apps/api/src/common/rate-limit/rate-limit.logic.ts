/**
 * 职责:频控纯逻辑——固定窗口 key 构造/判定/重试等待计算(无框架依赖,可全量单测)
 * 关联任务:T3 频控基础件(IDLE_TASKS);被 S-1 打卡 / P-4 防刷 / 认证等触点复用
 * 口径:Redis 固定窗口(INCR + EXPIRE),窗口粒度秒;主键=scope:principal:windowStart
 */

export interface RateLimitOptions {
  /** 窗口内允许的最大次数 */
  limit: number;
  /** 窗口长度(秒) */
  windowSeconds: number;
  /** 限流域(区分业务触点,如 checkin / report / auth) */
  scope: string;
}

/** 固定窗口起始时间戳(秒):now 向下取整到窗口边界 */
export function windowStart(nowMs: number, windowSeconds: number): number {
  return Math.floor(nowMs / 1000 / windowSeconds) * windowSeconds;
}

/** Redis key:rl:{scope}:{principal}:{windowStart} */
export function fixedWindowKey(scope: string, principal: string, start: number): string {
  return `rl:${scope}:${principal}:${start}`;
}

/** 判定:第 count 次请求是否放行(count 已含本次) */
export function isAllowed(count: number, limit: number): boolean {
  return count <= limit;
}

/** 距下一窗口的重试等待秒数(供响应提示;至少 1s) */
export function retryAfterSeconds(nowMs: number, windowSeconds: number): number {
  const currentWindow = windowStart(nowMs, windowSeconds);
  const nextWindowMs = (currentWindow + windowSeconds) * 1000;
  return Math.max(1, Math.ceil((nextWindowMs - nowMs) / 1000));
}

/** 校验配置合法性(装饰器误用时启动即暴露) */
export function assertOptions(options: RateLimitOptions): void {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
    throw new Error(`频控 limit 必须为正整数: ${options.limit}`);
  }
  if (!Number.isSafeInteger(options.windowSeconds) || options.windowSeconds < 1) {
    throw new Error(`频控 windowSeconds 必须为正整数: ${options.windowSeconds}`);
  }
  if (!options.scope) {
    throw new Error('频控 scope 不能为空');
  }
}
