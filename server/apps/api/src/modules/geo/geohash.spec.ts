/**
 * 职责:geohash 纯函数单测——编码基准(Wikipedia 日德兰向量)/解码回环/zoom 分级/聚合(M-2 验收线)
 */
import {
  aggregateClusters,
  cellCenter,
  decodeGeohashCell,
  encodeGeohash,
  geohashPrecisionForZoom
} from './geohash';

describe('encodeGeohash', () => {
  // 经典基准:丹麦日德兰半岛北端 (57.64911, 10.40744) → u4pruydqqvj(Wikipedia 示例;本实现精度上限 7)
  it('Wikipedia 基准向量一致(取前 7 位)', () => {
    expect(encodeGeohash(57.64911, 10.40744, 7)).toBe('u4pruyd');
  });

  it('杭州湖滨中心 5 位编码前缀稳定', () => {
    const hash = encodeGeohash(30.25902, 120.16607, 5);
    expect(hash).toHaveLength(5);
    expect(encodeGeohash(30.25902, 120.16607, 4)).toBe(hash.slice(0, 4));
  });

  it('精度 1-7 逐级前缀嵌套(cell 收缩单调)', () => {
    const lat = 30.25902;
    const lng = 120.16607;
    for (let p = 2; p <= 7; p += 1) {
      expect(encodeGeohash(lat, lng, p).startsWith(encodeGeohash(lat, lng, p - 1))).toBe(true);
    }
  });

  it('非法坐标/精度抛错', () => {
    expect(() => encodeGeohash(91, 0, 5)).toThrow();
    expect(() => encodeGeohash(0, 181, 5)).toThrow();
    expect(() => encodeGeohash(0, 0, 0)).toThrow();
    expect(() => encodeGeohash(0, 0, 8)).toThrow();
  });
});

describe('decodeGeohashCell / cellCenter', () => {
  it('编码点落在解码边界框内(回环不变式)', () => {
    const lat = 57.64911;
    const lng = 10.40744;
    const box = decodeGeohashCell(encodeGeohash(lat, lng, 6));
    expect(lat).toBeGreaterThanOrEqual(box.minLat);
    expect(lat).toBeLessThanOrEqual(box.maxLat);
    expect(lng).toBeGreaterThanOrEqual(box.minLng);
    expect(lng).toBeLessThanOrEqual(box.maxLng);
  });

  it('框尺寸随精度收缩', () => {
    const coarse = decodeGeohashCell('u');
    const fine = decodeGeohashCell('u4pru');
    expect(fine.maxLat - fine.minLat).toBeLessThan(coarse.maxLat - coarse.minLat);
  });

  it('非法 cell 抛错', () => {
    expect(() => decodeGeohashCell('au')).toThrow(); // a 不在 base32 字母表
    expect(() => decodeGeohashCell('')).toThrow();
  });

  it('中心点在框内', () => {
    const box = decodeGeohashCell('u4pru');
    const center = cellCenter('u4pru');
    expect(center.lat).toBeGreaterThanOrEqual(box.minLat);
    expect(center.lat).toBeLessThanOrEqual(box.maxLat);
  });
});

describe('geohashPrecisionForZoom', () => {
  it('zoom 分级单调不减', () => {
    const levels = [3, 5, 6, 8, 9, 11, 12, 14, 15, 20].map((z) => geohashPrecisionForZoom(z));
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
    expect(levels[0]).toBe(3);
    expect(levels[levels.length - 1]).toBe(7);
  });

  it('非法 zoom 抛错', () => {
    expect(() => geohashPrecisionForZoom(Number.NaN)).toThrow();
  });
});

describe('aggregateClusters', () => {
  const rows = [
    // 三点互距 ~5m,稳定落同一 precision-7 胞元(避开 30.25905 附近的 cell 边界)
    { id: 'a1', lat: 30.259, lng: 120.166, createdAt: '2026-08-01T00:00:00Z' },
    { id: 'a2', lat: 30.25901, lng: 120.16601, createdAt: '2026-08-02T00:00:00Z' },
    { id: 'a3', lat: 30.25902, lng: 120.16602, createdAt: '2026-08-03T00:00:00Z' },
    { id: 'b1', lat: 30.27, lng: 120.18, createdAt: '2026-08-04T00:00:00Z' }
  ];

  it('相近点落入同一 cell,计数正确且按 count 降序', () => {
    const clusters = aggregateClusters(rows, 7);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].count).toBe(3);
    expect(clusters[0].topContentId).toBe('a3'); // 最新创建
    expect(clusters[1].count).toBe(1);
  });

  it('低精度合并为单 cell', () => {
    const clusters = aggregateClusters(rows, 4);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(4);
  });

  it('同毫秒并列取 id 字典序(聚合稳定)', () => {
    const tie = [
      { id: 'x1', lat: 30.2590, lng: 120.1660, createdAt: '2026-08-01T00:00:00Z' },
      { id: 'x2', lat: 30.2590, lng: 120.1660, createdAt: '2026-08-01T00:00:00Z' }
    ];
    expect(aggregateClusters(tie, 7)[0].topContentId).toBe('x2');
  });

  it('空候选集返回空数组', () => {
    expect(aggregateClusters([], 5)).toEqual([]);
  });
});
