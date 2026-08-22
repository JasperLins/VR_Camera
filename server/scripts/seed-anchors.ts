// 职责:附近查询压测种子数据——1 万锚点散布杭州湖滨中心 ~1.5km(PKG-10 M-1 P95 验收前置)
// 关联任务:PKG-10(T4);用法:cd server && node scripts/seed-anchors.ts(可重复执行,先清旧种子)
// 说明:Node 24 原生 TS 剥离运行;经 packages/database 编译产物导入 PrismaClient(不引入新依赖)
import { PrismaClient } from '../packages/database/dist/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://vr:vrmemento@127.0.0.1:55432/vrmemento?schema=public' } }
});

/** 杭州湖滨中心(WGS84) */
const CENTER = { lat: 30.25902, lng: 120.16607 };
const TOTAL = 10_000;
const SEED_NICK = 'seed-bot';

/** Box-Muller 正态近似,σ 由米换算度(纬度 1° ≈ 111320m) */
function gaussian(sigma: number): number {
  const u = Math.max(Math.random(), 1e-9);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

async function main(): Promise<void> {
  const started = Date.now();

  // 幂等:清理旧种子(用户级联删除锚点)
  const old = await prisma.user.findMany({ where: { nickname: SEED_NICK }, select: { id: true } });
  if (old.length > 0) {
    const res = await prisma.user.deleteMany({ where: { nickname: SEED_NICK } });
    console.log(`cleaned ${res.count} old seed users`);
  }

  const users = await Promise.all(
    ['s1', 's2', 's3', 's4', 's5'].map((n) =>
      prisma.user.create({ data: { nickname: SEED_NICK }, select: { id: true } }).then((u) => [n, u.id] as const)
    )
  );
  const userIds = users.map(([, id]) => id);

  const now = Date.now();
  const values: Array<Record<string, unknown>> = [];
  for (let i = 0; i < TOTAL; i += 1) {
    const lat = CENTER.lat + gaussian(500 / 111_320);
    const lng = CENTER.lng + gaussian(500 / (111_320 * Math.cos((CENTER.lat * Math.PI) / 180)));
    const isPrivate = Math.random() < 0.1;
    const roll = Math.random();
    const status = roll < 0.95 ? 'VISIBLE' : roll < 0.98 ? 'HIDDEN' : 'DELETED';
    values.push({
      userId: userIds[i % userIds.length],
      contentType: 'TEXT',
      title: `湖滨留念 #${i}`,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      altitude: Math.round(5 + Math.random() * 30),
      altitudeSource: 'GPS',
      visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
      status,
      aiGenerated: Math.random() < 0.3,
      createdAt: new Date(now - Math.random() * 90 * 24 * 3600 * 1000)
    });
  }

  // 分批 createMany(单批 1000,避免超长 SQL)
  for (let i = 0; i < values.length; i += 1000) {
    await prisma.anchor.createMany({ data: values.slice(i, i + 1000) } as never);
  }
  console.log(`seeded ${values.length} anchors in ${Date.now() - started}ms`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
