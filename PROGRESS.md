# PROGRESS — 开发进度与断点续接

> **用途**:任何新会话(人或 AI)只读本文件即可知道:做到哪一步、下一步做什么、有什么坑、怎么验证。
> **更新纪律(强制)**:每次会话结束前更新 §1 当前断点与 §6 会话记录;每完成一个任务包勾选 §3/§4 清单。
> 与 `work/dev-log.md` 的分工:dev-log 记**批次台账**(DoD/token 统计/监督者签字),本文件记**可执行的工作断点**。

---

## 0. 新会话启动顺序(5 步,不可跳)

1. `work/AGENTS.md` —— 开发纪律(批次推进/docs 只读/红线);
2. `work/docs/08-handoff/ai-dev-handoff.md` §4 —— 批次与任务包全景(27 任务包/6 批次);
3. **本文件** —— 当前断点与下一步;
4. `CONVENTIONS.md` —— 编码规范(文件头注释/公共抽取/错误码);
5. 即将开工的批次在 `work/docs/03-requirements/feature-list.md` 中的子任务行(工时/依赖/一句线验收)。

## 1. 当前断点(最近一次更新:2026-08-23)

| 项 | 状态 |
|---|---|
| 位置 | **B1 服务端部分完成**(PKG-13 全部 + PKG-08 auth/SSE);client 已过 Unity 编译+单测验证;下一步见 §4 |
| git | 已推送 `origin/main`(含本次 B1 提交) |
| server | ✅ lint / test(52 用例)/ build 全绿;Prisma schema 已加 auth_identities(**迁移未执行**——Docker 代理阻断,§3-A) |
| client | ✅ **Unity 验证通过**:6000.0.82f1 批处理编译 0 error + EditMode 15/15 全绿(修复过 Conv 偏心率常量数量级 bug);真机出包验证待用户手动(client/README.md §2 后三项) |
| admin | 未开工(规划 B3/PKG-22,见 admin/README.md) |

## 2. 已完成清单(勾选项为「已实现且已验证」)

- [x] 仓库初始化:client/server/admin 三区 + 根规范文件(.gitignore/.editorconfig/CONVENTIONS/README)
- [x] PKG-02(L-1 服务端工程地基):NestJS 10 monorepo,lint/test/build 三门禁全绿
- [x] PKG-01(A-1 客户端工程地基):源码 + **Unity 编译 0 error + EditMode 15/15 验证通过**
- [x] PKG-03(L-4 云上部署)**本地部分**:docker-compose(PG16+PostGIS/Redis7)+ .env 模板;云端开通属人工
- [x] PKG-07(B-2 坐标转换):Conv.cs + Node 基准验算 + Unity EditMode 单测全绿(北京公开基准 Δ<1e-9);真机验收(PR-1c)未做
- [x] Prisma schema:users/token_accounts/token_ledger/gen_tasks/anchors + auth_identities(游客/微信身份)
- [x] packages/shared:env 校验(含 JWT_SECRET 生产防线)/常量/错误码/生成任务状态机/信封契约(24 用例)
- [x] **PKG-13 Token 账本(B1)**:原子扣减(条件 UPDATE)/幂等重放(同参返回/异参报 40902)/注册赠 80/取消比例退款纯函数 + 28 用例全绿
- [x] **PKG-08 auth+SSE(B1 部分)**:游客登录(deviceId 复用)/微信登录(未配置资质明确报 50001)/JWT+守卫;SSE `/v1/tasks/:id/events`(Redis pub/sub);schema 已加 auth_identities
- [x] 说明文档体系:根/server/client/admin README + 9 个模块级 README(逐文件功能表)
- [ ] **B1 剩余**:PKG-09 客户端基础面(4 Tab 壳/登录对接/设备分级/组件视觉版,Unity 已装可开工)
- [ ] Prisma 迁移执行(auth_identities 等待 Docker 修复后 `pnpm migrate:dev`)
- [ ] PKG-04/05/06(PR-1/2/3 三项真机预研)——人工主导,未开始
- [ ] client 真机出包验证(Build Settings 切 Android / Package Name / Hello 场景真机 Run)

## 3. 阻塞与待人工(编号续接用)

| # | 事项 | 影响范围 | 解法位置 |
|---|---|---|---|
| A | **未解** Docker Desktop 代理(127.0.0.1:10808)WSL2 内不可达,镜像拉不下来 | 迁移执行、health 运行时验收 | server/README.md §6(三选一方案);修复后跑 `pnpm db:up && pnpm migrate:dev && pnpm db:patch && pnpm dev` |
| ~~B~~ | ✅ 已解(2026-08-23):Unity 6000.0.82f1 已装(`D:\Unity\`),工程验证通过 | — | 命令行验证法已写入 client/README.md §2 |
| C | 真机预研 PR-1(锚定)/PR-2(高德 SDK)/PR-3(Meshy 连通) | 决定 B2 锚定/地图/生成实现方案与 RA-2/3/4 复审卡 | 需 ≥3 台 ARCore 机型 |
| D | 阿里云 ECS/RDS/OSS 开通、微信开放平台资质、ICP/算法备案、Meshy key | B1 末期联调与上线轨道(不阻塞开发);WECHAT_APPID/SECRET 留空时微信登录有明确防线 | work/AGENTS.md §3 人工环节清单 |

## 4. 下一步开工清单

**优先级 1:PKG-09 客户端基础面(9 人日,Unity 已就绪)**
- A-2 App 壳:4 Tab + 相机凸起(还原 work/UI/map-home 等;TabBar 豁免 A-701);PageRouter 已就绪,需要建首场景与页面预制体;
- A-3 登录对接:`client/Networking` 的 IAuthTokenProvider 实现接 `POST /v1/auth/guest`(服务端已就绪);
- A-4 设备分级检测(SystemInfo 填充 AppConfig.SetDeviceTier);
- A-6 通用组件贴纸视觉版(色板 ui-spec §7.1:珊瑚 #FF6B4A/墨描边 2px/硬阴影)。

**优先级 2:PKG-08 收尾(依赖 §3-A Docker 修复)**
- `pnpm migrate:dev` 落 auth_identities 迁移;起服务实测 guest 登录 → 余额 80 → /v1/auth/me 全链路(curl);
- SSE 多实例互通 demo(两实例 + Redis pub/sub)。

**之后:B2 批次(PKG-10 地理查询 / 12 AR 相机层 / 14 生成网关 / 17 审核版权 / 18 积分打卡)**
- PKG-10 可先做:geohash 聚合纯逻辑 + ST_DWithin 查询(依赖迁移落库);
- PKG-14 的 Gen3DProvider 抽象可先行(Meshy 适配器等 PR-3 结论)。

## 5. 环境事实(已探明,新会话直接引用)

| 项 | 值 / 说明 |
|---|---|
| Node | v24.19.0(nvm4w;文档口径 20 LTS,实测兼容,已登记 dev-log) |
| pnpm | 11.7.0;**构建脚本白名单在 pnpm-workspace.yaml allowBuilds**(新增带安装脚本的依赖要加白名单) |
| Docker | 28.3.2 守护进程可起;镜像拉取被代理问题阻断(§3-A) |
| Unity | **已装 6000.0.82f1**(`D:\Unity\6000.0.82f1`);ProjectVersion.txt 已对齐;批处理验证命令在 client/README.md §2 |
| git 远程 | git@github.com:JasperLins/VR_Camera.git(main 分支) |
| 版本锁定 | NestJS 10 / Prisma 5.22 / BullMQ 5 / TS 5.6 / zod 3 / @nestjs/jwt 10.2 / AR Foundation 6.0.3 |
| 常用命令 | server/:pnpm i · pnpm -r lint/test/build · pnpm db:up · pnpm migrate:dev · pnpm dev(详见 server/README.md §2) |
| 已踩坑 | ① Prisma 关系字段反向缺失会 P1012;② TS enum 成员不能单独命名导入;③ pnpm 11 拦截 postinstall 需 allowBuilds;④ Bootstrap 不能放 Core(循环依赖),已独立 VRM.Bootstrap;⑤ C# 数字分隔符字面量易错数量级(Conv 偏心率曾写成 6.69e-4,靠基准单测拦下);⑥ npmmirror 缺 @nestjs/jwt@10.2.2,用 10.2.0;⑦ spec 桩需自带事务回滚语义(快照还原法) |

## 6. 会话记录索引

| 会话 | 日期 | 内容 | 产出/提交 |
|---|---|---|---|
| 1 | 2026-08-22 | 规划+初始化+Sprint-0 AI 侧地基(server 全绿/client 源码/规范文档/推送) | 396693c |
| 2 | 2026-08-22 | 建立 PROGRESS.md 断点续接机制 | 5bb4dfb |
| 3 | 2026-08-23 | client Unity 验证(编译 0 error + 15/15 单测,修 Conv 常量 bug);B1 服务端:PKG-13 Token 账本全套 + PKG-08 auth(游客/微信/JWT)+ SSE 骨架 + auth_identities schema;52 用例全绿 | (本次提交) |
