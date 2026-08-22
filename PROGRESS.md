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

## 1. 当前断点(最近一次更新:2026-08-23 会话 4)

| 项 | 状态 |
|---|---|
| 位置 | **B1 大部分完成**:PKG-13 全部 + PKG-08 auth/SSE + PKG-09 客户端基础面(A-2/3/4/6);仅剩迁移执行(Docker)与 L-2 业务表补全 |
| git | 已推送 `origin/main` |
| server | ✅ lint / test(52)/ build 全绿;auth_identities 迁移未执行(Docker 阻断 §3-A) |
| client | ✅ Unity 验证:编译 0 error + **EditMode 30/30 全绿**(Conv 基准/信封契约/设备分级/登录会话/TabBar 规格);真机出包走查待人工 |
| admin | 未开工(B3/PKG-22) |

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
- [x] **PKG-09 客户端基础面(B1)**:A-2 App 壳(AppShell+TabBar 四格+中央凸起渐变相机钮,A-701 豁免联动)/ A-3 AuthSession 游客静默登录+令牌注入 / A-4 DeviceTierDetector / A-6 贴纸组件库(StickerTheme 设计令牌/StickerUi/Toast/Loading/EmptyState/GradientImage/RoundedSpriteFactory)+ Editor 建场景菜单;新增 15 用例,合计 30/30
- [ ] B1 收尾:Prisma 迁移执行(§3-A)、L-2 业务表补全(好友授权/口令/举报/审核)、SSE 多实例 demo、4 Tab 壳真机走查(APK 出包,人工)
- [ ] PKG-04/05/06(PR-1/2/3 三项真机预研)——人工主导,未开始
- [ ] client 真机出包验证(Build Settings 切 Android / Package Name / Hello 场景真机 Run)

## 3. 阻塞与待人工(编号续接用)

| # | 事项 | 影响范围 | 解法位置 |
|---|---|---|---|
| ~~A~~ | ✅ 已解(2026-08-23):Docker 镜像就位+中间件全链路验收(health/迁移/登录/赠送 80 实测通过);**拉新镜像**需 1 分钟窗口操作(server/README §6),一劳永逸方案待用户在 v2rayN 开 Allow LAN | 日常开发无影响 | server/README.md §6 |
| ~~B~~ | ✅ 已解(2026-08-23):Unity 6000.0.82f1 已装(`D:\Unity\`),工程验证通过 | — | 命令行验证法已写入 client/README.md §2 |
| C | 真机预研 PR-1(锚定)/PR-2(高德 SDK)/PR-3(Meshy 连通) | 决定 B2 锚定/地图/生成实现方案与 RA-2/3/4 复审卡 | 需 ≥3 台 ARCore 机型 |
| D | 阿里云 ECS/RDS/OSS 开通、微信开放平台资质、ICP/算法备案、Meshy key | B1 末期联调与上线轨道(不阻塞开发);WECHAT_APPID/SECRET 留空时微信登录有明确防线 | work/AGENTS.md §3 人工环节清单 |

## 4. 下一步开工清单

> **闲时(自主)任务队列已建:[IDLE_TASKS.md](./IDLE_TASKS.md)** ——T0~T25 按序领取,含批次闸门/验收标准/不可自动清单;交互会话同样优先消化该队列。

**优先级 1:B1 收尾(依赖 §3-A Docker 修复 + 一次人工 Play 走查)**
- Docker 修复后:`pnpm db:up && pnpm migrate:dev && pnpm db:patch && pnpm dev` → curl 全链路实测(guest 登录→余额 80→/me);
- L-2 业务表补全:好友授权/私密口令/举报工单/审核记录(B3 各包用);
- 人工:Unity 打开 client → 菜单「VR留念→工程设置→创建 Main 场景」→ Play 走查 4 Tab 壳(client/README.md §5 有验收点;菜单根名用中文,防 Unity 6 包名误判)。

**优先级 2:B2 批次(PKG-10 地理查询 / 12 AR 相机层 / 14 生成网关 / 17 审核版权 / 18 积分打卡)**
- PKG-10 可先做:geohash 聚合纯逻辑 + ST_DWithin 查询 + P95 压测脚本(依赖迁移落库);
- PKG-14 的 Gen3DProvider 抽象 + 任务状态机服务化可先行(Meshy 适配器等 PR-3 结论);
- PKG-18 积分服务纯逻辑(打卡+2/日上限10/防刷规则)无依赖可先写。

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
| 已踩坑 | ① Prisma 关系字段反向缺失会 P1012;② TS enum 成员不能单独命名导入;③ pnpm 11 拦截 postinstall 需 allowBuilds;④ Bootstrap 不能放 Core(循环依赖),已独立 VRM.Bootstrap;⑤ C# 数字分隔符字面量易错数量级(Conv 偏心率曾写成 6.69e-4,靠基准单测拦下);⑥ npmmirror 缺 @nestjs/jwt@10.2.2,用 10.2.0;⑦ spec 桩需自带事务回滚语义(快照还原法);⑧ Docker Desktop 把系统代理注入 dockerd 独立网络命名空间(隔离回环不可达),settings-store manual 配置对注入无效、wc.dat 有旧缓存——拉新镜像走 server/README §6 窗口流程;⑨ Ubuntu WSL 的 postgres 经 mirrored 网络占用 5432 回环 → 本地 PG 端口 55432,连接串用 127.0.0.1 勿用 localhost(IPv6 优先会超时);⑩ prisma migrate dev 非交互终端必须带 --name;⑪ PG advisory lock 残留 → 重启 vrm-postgres 容器;⑫ JWT 守卫把 req.user 换成 User 对象,控制器取 sub 会得到 undefined |

## 6. 会话记录索引

| 会话 | 日期 | 内容 | 产出/提交 |
|---|---|---|---|
| 1 | 2026-08-22 | 规划+初始化+Sprint-0 AI 侧地基(server 全绿/client 源码/规范文档/推送) | 396693c |
| 2 | 2026-08-22 | 建立 PROGRESS.md 断点续接机制 | 5bb4dfb |
| 3 | 2026-08-23 | client Unity 验证(编译 0 error + 15/15 单测,修 Conv 常量 bug);B1 服务端:PKG-13 Token 账本全套 + PKG-08 auth(游客/微信/JWT)+ SSE 骨架 + auth_identities schema;52 用例全绿 | 8b3130f |
| 4 | 2026-08-23 | PKG-09 客户端基础面:A-2 App 壳(TabBar 四格+凸起相机钮/A-701 豁免)、A-3 AuthSession 游客登录对接、A-4 设备分级、A-6 贴纸组件库+设计令牌、Editor 建场景菜单;EditMode 30/30(修 3 个编译错:Graphic 私有 API/圆形网格/UIVertex 大小写/结构体 as) | f2cf669 |
| 5 | 2026-08-23 | Docker 环境修复+PKG-08/13 运行时验收:定位三层根因(系统代理注入独立 netns/wc.dat 缓存/Ubuntu WSL 占 5432),镜像就位,首次迁移+PostGIS 落库,health/guest 登录/赠送 80/幂等全链路 curl 实测通过;修 token.controller CurrentUser 字段 bug;本地 PG 端口改 55432 | (本次提交) |
