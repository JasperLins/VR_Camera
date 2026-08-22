/**
 * 职责:锚点放置与管理纯逻辑——失效档位/坐标校验/回收期计算/口令哈希(N-1/N-3/N-4 口径唯一来源)
 * 关联需求:FR-03/FR-06;关联任务:PKG-16/20(T14/T15);决策:D-006 WGS84 / D-012 私密默认永久
 */
import { createHash, randomBytes } from 'node:crypto';

/** 失效档位(7d/30d/永久;私密默认永久,RD FR-03) */
export const EXPIRY_OPTIONS = Object.freeze({
  SEVEN_DAYS: '7d',
  THIRTY_DAYS: '30d',
  FOREVER: 'forever'
} as const);

export type ExpiryOption = (typeof EXPIRY_OPTIONS)[keyof typeof EXPIRY_OPTIONS];

export const EXPIRY_VALUES: readonly string[] = Object.values(EXPIRY_OPTIONS);

/** 永久删除回收期(30 天;期间可恢复,回收站显示倒计时,UX S21/E23) */
export const RECYCLE_DAYS = 30;

/** 档位 → expiresAt(forever → null 永不过期) */
export function expiresAtFrom(option: ExpiryOption, now = new Date()): Date | null {
  switch (option) {
    case EXPIRY_OPTIONS.SEVEN_DAYS:
      return new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    case EXPIRY_OPTIONS.THIRTY_DAYS:
      return new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    case EXPIRY_OPTIONS.FOREVER:
      return null;
  }
}

/** 回收截止(软删除时间 + 30 天;过期行由人工/脚本物理清理) */
export function recycleDeadline(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + RECYCLE_DAYS * 24 * 3600 * 1000);
}

/** 放置参数校验:坐标 WGS84 合法 + 私密强制永久(D-012:私密内容默认永久) */
export function validatePlacement(input: {
  latitude: number;
  longitude: number;
  altitude: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  expiry: ExpiryOption;
}): string | null {
  if (input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.latitude)) {
    return `非法纬度: ${input.latitude}`;
  }
  if (input.longitude < -180 || input.longitude > 180 || !Number.isFinite(input.longitude)) {
    return `非法经度: ${input.longitude}`;
  }
  if (!Number.isFinite(input.altitude)) {
    return `非法海拔: ${input.altitude}`;
  }
  if (input.visibility === 'PRIVATE' && input.expiry !== EXPIRY_OPTIONS.FOREVER) {
    return '私密内容仅支持永久有效(D-012)';
  }
  return null;
}

/** 口令哈希(sha256;库内只存哈希,明文仅生成时返回一次) */
export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 口令生成(8 位数字,兼容当面口播;熵 1e8,配 5 次失败冷却,UX E25) */
export function generateShareToken(): string {
  return randomBytes(4).readUInt32BE(0).toString().padStart(8, '0').slice(0, 8);
}

/** 口令校验失败冷却窗口(5 次失败 → 冷却 10 分钟,Redis 侧计数) */
export const PASSCODE_MAX_ATTEMPTS = 5;
export const PASSCODE_COOLDOWN_SECONDS = 600;
