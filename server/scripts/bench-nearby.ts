// 职责:附近内容查询 P95 计时脚本——半径 500m/5km 各 N 轮,输出 p50/p95/p99(PKG-10 M-1 验收线 <500ms)
// 关联任务:PKG-10(T4);用法:先 node scripts/seed-anchors.ts,再 node scripts/bench-nearby.ts
// 口径:与 GeoService.nearby 同构 SQL(ST_DWithin + GiST),结果记 work/dev-log.md 台账
import { Prisma, PrismaClient } from '../packages/database/dist/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://vr:vrmemento@127.0.0.1:55432/vrmemento?schema=public' } }
});

const CENTER = { lat: 30.25902, lng: 120.16607 };

async function once(radius: number): Promise<number> {
  const started = performance.now();
  await prisma.$queryRaw(Prisma.sql`
    SELECT a.id, ST_Distance(a.geog, ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${CENTER.lat}), 4326)::geography) AS distance_m
    FROM anchors a
    WHERE a.status = 'VISIBLE'
      AND (a.visibility = 'PUBLIC' OR a.user_id = ${'bench-user'})
      AND a.altitude BETWEEN 5 AND 35
      AND ST_DWithin(a.geog, ST_SetSRID(ST_MakePoint(${CENTER.lng}, ${CENTER.lat}), 4326)::geography, ${radius})
    ORDER BY distance_m ASC
    LIMIT 20 OFFSET 0
  `);
  return performance.now() - started;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function bench(label: string, radius: number, rounds: number): Promise<void> {
  await once(radius); // 预热(首次含计划编译,不计入)
  const samples: number[] = [];
  for (let i = 0; i < rounds; i += 1) {
    samples.push(await once(radius));
  }
  const sorted = [...samples].sort((a, b) => a - b);
  console.log(
    `${label} (n=${rounds}): p50=${percentile(sorted, 50).toFixed(1)}ms p95=${percentile(sorted, 95).toFixed(1)}ms p99=${percentile(sorted, 99).toFixed(1)}ms max=${sorted[sorted.length - 1].toFixed(1)}ms`
  );
}

async function main(): Promise<void> {
  const total = await prisma.anchor.count();
  console.log(`anchors in db: ${total}`);
  await bench('nearby radius=500m', 500, 200);
  await bench('nearby radius=5km  ', 5000, 50);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
