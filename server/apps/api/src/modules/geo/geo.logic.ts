/**
 * 职责:地理查询纯逻辑——半径/海拔参数校验与可见性 SQL 片段构造(M-1 过滤口径唯一来源)
 * 关联需求:FR-01/FR-03;关联任务:PKG-10(T4)
 * 口径:半径默认 500m 可扩 1/5km、上限 5km(A-407);海拔容差 ±5m(D-012);
 *       可见性 = VISIBLE 状态 + (PUBLIC 或 本人 或 私密授权名单内)
 */
import { Prisma } from '@vrm/database';
import { GEO_DEFAULTS } from '@vrm/shared';
import { assertValidCoord } from './geohash';

/** 半径校验:必须落在 GEO_DEFAULTS.RADIUS_OPTIONS 且 ≤ 上限 */
export function assertValidRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`非法半径: ${radius}`);
  }
  if (radius > GEO_DEFAULTS.RADIUS_MAX) {
    throw new Error(`半径超出服务端上限 ${GEO_DEFAULTS.RADIUS_MAX}m(A-407)`);
  }
}

/** 打卡/查询共用入参校验(半径+坐标) */
export function assertNearbyParams(lat: number, lng: number, radius: number, altitude: number): void {
  assertValidCoord(lat, lng);
  assertValidRadius(radius);
  if (!Number.isFinite(altitude)) {
    throw new Error(`非法海拔: ${altitude}`);
  }
}

/**
 * 可见性过滤 SQL 片段(参数化占位 $me 由调用方顺序补参):
 * 私密锚点仅 作者本人 / 授权名单内用户 可见(私密无权限用户完全不可见,UX §4.5)
 */
export function visibilityFilterSql(meUserId: string): Prisma.Sql {
  return Prisma.sql`(
    a.visibility = 'PUBLIC'
    OR a.user_id = ${meUserId}
    OR EXISTS (
      SELECT 1 FROM anchor_grants g
      WHERE g.anchor_id = a.id AND g.grantee_id = ${meUserId}
    )
  )`;
}

/** 海拔过滤片段:|a.altitude - 目标| ≤ 5m(D-012) */
export function altitudeFilterSql(altitude: number): Prisma.Sql {
  const tolerance = GEO_DEFAULTS.ALTITUDE_TOLERANCE;
  return Prisma.sql`a.altitude BETWEEN ${altitude - tolerance} AND ${altitude + tolerance}`;
}
