# admin/ — VR 留念管理后台(AntD + Vite)

## 职责(PKG-22 / T21)

- 内容管理:全量锚点列表(状态过滤/AI 标识列)+ 强制下架(U-1/U-2);
- 举报工单:SLA 排序列表(超时红标)+ 受理→复核→处置流转,处置结论必填(U-3);
- 登录 RBAC:deviceId 走服务端 `/v1/auth/guest` 复用 JWT,role=ADMIN 放行,普通用户 40300 拒绝。

## 文件

| 文件 | 说明 |
|---|---|
| src/api.ts | 统一信封解包/鉴权注入的 fetch 客户端 |
| src/App.tsx | 登录门卫 + 侧边栏骨架(双页) |
| src/pages/Login.tsx | deviceId 登录(RBAC 校验) |
| src/pages/ContentPage.tsx | 内容管理 + 强制下架 |
| src/pages/ReportsPage.tsx | 举报工单处置流 |

## 运行

```bash
# 前提:服务端 api 已起(默认 http://127.0.0.1:3000)
pnpm i
pnpm dev     # http://localhost:5173(dev 代理 /v1 → 3000)
pnpm build   # 产物 dist/
```

演示账号:先在 server/ 执行 `node scripts/seed-admin.ts`(默认 deviceId `admin-demo-0001`),
后台登录页输入该 deviceId。正式员工账号体系属 B5 上线轨道。

## 注意

- pnpm 11 供应链防护:`pnpm-workspace.yaml` allowBuilds 已放行 esbuild;
- 新增带安装脚本的依赖需同步增补 allowBuilds。
