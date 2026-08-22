/**
 * 职责:地理查询服务——附近内容(ST_DWithin)/geohash 聚合/热门区域(PKG-10 M-1/M-2/M-3)
 * 关联需求:FR-01/FR-03;关联任务:PKG-10(T4/T5/T6)
 * 实现要点:
 *  - 空间过滤走 PostGIS ST_DWithin(geography, GiST 索引),参数全部占位符化(禁字符串拼接);
 *  - 可见性/海拔口径收敛在 geo.logic(纯函数单测);
 *  - 聚合在 Node 内存完成(候选集已被半径过滤,万级行毫秒级),geohash 算法唯一来源 geohash.ts。
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@vrm/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { aggregateClusters, cellCenter, ClusterInputRow, GeoCluster, geohashPrecisionForZoom } from './geohash';
import { altitudeFilterSql, assertNearbyParams, visibilityFilterSql } from './geo.logic';

/** 附近内容行(出参坐标 WGS84) */
export interface NearbyAnchor {
  id: string;
  title: string;
  contentType: 'MODEL' | 'IMAGE' | 'TEXT';
  latitude: number;
  longitude: number;
  altitude: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  aiGenerated: boolean;
  distanceM: number;
}

export interface NearbyResult {
  items: NearbyAnchor[];
  total: number;
  page: number;
  pageSize: number;
}

interface RawNearbyRow {
  id: string;
  title: string;
  content_type: 'MODEL' | 'IMAGE' | 'TEXT';
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  altitude: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  ai_generated: boolean;
  distance_m: number;
}

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /** M-1 附近内容:半径 + 海拔 ±5m + 可见性过滤,按距离升序分页 */
  async nearby(params: {
    userId: string;
    lat: number;
    lng: number;
    radius: number;
    altitude: number;
    page: number;
    pageSize: number;
  }): Promise<NearbyResult> {
    assertNearbyParams(params.lat, params.lng, params.radius, params.altitude);
    const center = Prisma.sql`ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography`;

    const rows = await this.prisma.$queryRaw<RawNearbyRow[]>(Prisma.sql`
      SELECT a.id, a.title, a.content_type, a.latitude, a.longitude, a.altitude,
             a.visibility, a.ai_generated,
             ST_Distance(a.geog, ${center}) AS distance_m
      FROM anchors a
      WHERE a.status = 'VISIBLE'
        AND ${visibilityFilterSql(params.userId)}
        AND ${altitudeFilterSql(params.altitude)}
        AND ST_DWithin(a.geog, ${center}, ${params.radius})
      ORDER BY distance_m ASC
      LIMIT ${params.pageSize} OFFSET ${(params.page - 1) * params.pageSize}
    `);

    const [{ total }] = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM anchors a
      WHERE a.status = 'VISIBLE'
        AND ${visibilityFilterSql(params.userId)}
        AND ${altitudeFilterSql(params.altitude)}
        AND ST_DWithin(a.geog, ${center}, ${params.radius})
    `);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        contentType: row.content_type,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        altitude: row.altitude,
        visibility: row.visibility,
        aiGenerated: row.ai_generated,
        distanceM: Math.round(row.distance_m)
      })),
      total: Number(total),
      page: params.page,
      pageSize: params.pageSize
    };
  }

  /** M-2 geohash 聚合:半径内候选行 → zoom 分级网格(cell/count/top_content) */
  async clusters(params: {
    userId: string;
    lat: number;
    lng: number;
    radius: number;
    zoom: number;
  }): Promise<GeoCluster[]> {
    assertNearbyParams(params.lat, params.lng, params.radius, 0);
    const center = Prisma.sql`ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography`;

    const rows = await this.prisma.$queryRaw<Array<{ id: string; latitude: Prisma.Decimal; longitude: Prisma.Decimal; created_at: Date }>>(Prisma.sql`
      SELECT a.id, a.latitude, a.longitude, a.created_at
      FROM anchors a
      WHERE a.status = 'VISIBLE'
        AND ${visibilityFilterSql(params.userId)}
        AND ST_DWithin(a.geog, ${center}, ${params.radius})
    `);

    const input: ClusterInputRow[] = rows.map((row) => ({
      id: row.id,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      createdAt: row.created_at
    }));
    return aggregateClusters(input, geohashPrecisionForZoom(params.zoom));
  }

  /**
   * M-3 热门区域:全城可见内容密度 Top N(geohash 网格,precision 6 ≈ 1.2km×0.6km)。
   * 打卡数暂以锚点数代理(S-1 打卡流水落库后切换口径,IDLE_TASKS T6 备注)。
   */
  async hotRegions(params: { precision?: number; limit?: number }): Promise<
    Array<{ cell: string; anchorCount: number; center: { lat: number; lng: number } }>
  > {
    const precision = params.precision ?? 6;
    const limit = params.limit ?? 10;
    if (!Number.isSafeInteger(precision) || precision < 1 || precision > 7) {
      throw new Error(`precision 必须为 1-7: ${precision}`);
    }

    const rows = await this.prisma.$queryRaw<Array<{ cell: string; anchor_count: number }>>(Prisma.sql`
      SELECT LEFT(ST_GeoHash(a.geog::geometry, ${precision}::int), ${precision}::int) AS cell,
             COUNT(*)::int AS anchor_count
      FROM anchors a
      WHERE a.status = 'VISIBLE' AND a.visibility = 'PUBLIC'
      GROUP BY 1
      ORDER BY anchor_count DESC, cell ASC
      LIMIT ${limit}::int
    `);

    return rows.map((row) => ({
      cell: row.cell,
      anchorCount: row.anchor_count,
      center: cellCenter(row.cell)
    }));
  }
}
