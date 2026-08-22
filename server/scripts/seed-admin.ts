// 职责:管理后台演示账号种子——固定 deviceId 提升为 ADMIN 角色(PKG-22 T21 验收:路由守卫演示账号)
// 用法:cd server && node scripts/seed-admin.ts [deviceId](默认 admin-demo-0001)
// 说明:正式管理账号体系(员工表/密码)属 B5 上线轨道;演示账号仅供后台走查
import { PrismaClient } from '../packages/database/dist/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://vr:vrmemento@127.0.0.1:55432/vrmemento?schema=public' } }
});

async function main(): Promise<void> {
  const deviceId = process.argv[2] ?? 'admin-demo-0001';
  const identity = await prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: 'GUEST', providerUserId: deviceId } },
    include: { user: true }
  });

  if (identity) {
    const updated = await prisma.user.update({
      where: { id: identity.userId },
      data: { role: 'ADMIN', nickname: '运营演示账号' }
    });
    console.log(`admin demo ready: deviceId=${deviceId} userId=${updated.id} (existing user promoted)`);
  } else {
    const user = await prisma.user.create({
      data: {
        nickname: '运营演示账号',
        role: 'ADMIN',
        identities: { create: { provider: 'GUEST', providerUserId: deviceId } }
      }
    });
    console.log(`admin demo ready: deviceId=${deviceId} userId=${user.id} (created)`);
  }
  console.log('登录方式:后台登录页输入 deviceId 走 /v1/auth/guest,role=ADMIN 放行');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
