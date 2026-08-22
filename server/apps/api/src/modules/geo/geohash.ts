/**
 * 职责:geohash 编码/解码纯函数(精度 1-7)+ zoom→精度分级——M-2 聚合与 M-3 热门区域的唯一算法源
 * 关联需求:FR-01;关联任务:PKG-10(T5/T6);算法口径:标准 base32 geohash(经纬交替二分)
 * 说明:服务端聚合在本进程内存完成(候选集已被 ST_DWithin 半径过滤,万级锚点毫秒级),
 *       不依赖 PostGIS ST_GeoHash,避免 TS/SQL 双实现漂移。
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CellBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** 校验经纬度合法(WGS84;D-006 全链口径) */
export function assertValidCoord(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`非法纬度: ${lat}`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error(`非法经度: ${lng}`);
  }
}

/** geohash 编码(精度 1-7) */
export function encodeGeohash(lat: number, lng: number, precision: number): string {
  assertValidCoord(lat, lng);
  if (!Number.isSafeInteger(precision) || precision < 1 || precision > 7) {
    throw new Error(`精度必须为 1-7 的整数: ${precision}`);
  }

  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let hash = '';
  let bit = 0; // 当前 base32 字符内的比特位(0-4)
  let ch = 0; // 当前 base32 字符累积值
  let even = true; // 偶数位切经度,奇数位切纬度

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        minLng = mid;
      } else {
        ch <<= 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch <<= 1;
        maxLat = mid;
      }
    }
    even = !even;

    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** 解码 cell → 边界框(聚合中心点/热门区域中心用) */
export function decodeGeohashCell(cell: string): CellBBox {
  if (!/^[0-9bcdefghjkmnpqrstuvwxyz]{1,7}$/.test(cell)) {
    throw new Error(`非法 geohash cell: ${cell}`);
  }

  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let even = true;

  for (const c of cell) {
    const idx = BASE32.indexOf(c);
    for (let bit = 4; bit >= 0; bit -= 1) {
      const one = (idx >> bit) & 1;
      if (even) {
        const mid = (minLng + maxLng) / 2;
        if (one) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (one) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      even = !even;
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** cell 中心点(地图落点/热门区域标注) */
export function cellCenter(cell: string): GeoPoint {
  const box = decodeGeohashCell(cell);
  return { lat: (box.minLat + box.maxLat) / 2, lng: (box.minLng + box.maxLng) / 2 };
}

/**
 * zoom(地图缩放级 3-20)→ geohash 精度(1-7)。
 * 分级依据:cell 视觉尺寸 ~屏幕 1/8 以上才聚合,高缩放级退化为明细(精度 7 ≈ 152m)。
 */
export function geohashPrecisionForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    throw new Error(`非法 zoom: ${zoom}`);
  }
  if (zoom <= 5) return 3;
  if (zoom <= 8) return 4;
  if (zoom <= 11) return 5;
  if (zoom <= 14) return 6;
  return 7;
}

/** 聚合单元格视图(M-2 契约:cell/count/topContentId) */
export interface GeoCluster {
  cell: string;
  count: number;
  center: GeoPoint;
  /** 胞内最新内容 id(同刻并列取字典序,保证聚合稳定) */
  topContentId: string | null;
}

export interface ClusterInputRow {
  id: string;
  lat: number;
  lng: number;
  createdAt: Date | string;
}

/** 按精度聚合候选行为网格 {cell → count + 最新内容}(纯函数,单测主对象) */
export function aggregateClusters(rows: ClusterInputRow[], precision: number): GeoCluster[] {
  interface Acc {
    count: number;
    topId: string;
    topAt: number;
    topKey: string;
    lat: number;
    lng: number;
  }
  const cells = new Map<string, Acc>();

  for (const row of rows) {
    const cell = encodeGeohash(row.lat, row.lng, precision);
    const at = new Date(row.createdAt).getTime();
    const acc = cells.get(cell);
    if (!acc) {
      cells.set(cell, { count: 1, topId: row.id, topAt: at, topKey: row.id, lat: row.lat, lng: row.lng });
      continue;
    }
    acc.count += 1;
    // top_content:最新创建者胜,并列(同毫秒)取 id 字典序稳定
    if (at > acc.topAt || (at === acc.topAt && row.id > acc.topKey)) {
      acc.topId = row.id;
      acc.topAt = at;
      acc.topKey = row.id;
      acc.lat = row.lat;
      acc.lng = row.lng;
    }
  }

  return [...cells.entries()]
    .map(([cell, acc]) => ({
      cell,
      count: acc.count,
      center: cellCenter(cell),
      topContentId: acc.count > 0 ? acc.topId : null
    }))
    .sort((a, b) => b.count - a.count || a.cell.localeCompare(b.cell));
}
