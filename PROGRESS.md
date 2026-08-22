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

## 1. 当前断点(最近一次更新:2026-08-23 会话 6)

| 项 | 状态 |
|---|---|
| 位置 | **B1 收尾 + B2 全部 + B3 服务端/admin 全部完成**(T1-T16、T21;用户授权豁免签字闸门,人工待验项见 §3-E);**T0/T17-T20 客户端任务被 Unity 编辑器占用阻断**(§3-E) |
| git | 本会话 7 个提交待推送 `origin/main` |
| server | ✅ lint / test(122)/ build 全绿;12 模块全量落地(auth/ledger/sse/geo/generation/safety/report/points/checkin/anchors/admin + 频控件);**全部 live e2e 通过**(SSE 双实例/生成全链路/取消退款/B2 12项/B3 20项/admin RBAC) |
| client | 上会话状态不变(EditMode 30/30);本会话客户端任务因 Unity 开着无法批处理验证,已顺延 |
| admin | ✅ Vite+React+AntD 后台可构建可运行(演示账号 admin-demo-0001;scripts/seed-admin.ts) |

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
- [x] B1 收尾(AI 侧):L-2 业务表补全(8 表)、SSE 多实例 demo(PASS)、频控基础件(2026-08-23 会话 6)
- [x] **B2 全部(PKG-10/14/17/18)**:geo 三接口(P95 12ms)+ 生成网关全链路(mock provider,含取消比例退)+ 机审/同意留痕 + 举报工单 + 积分 + 防刷打卡
- [x] **B3 服务端(PKG-15/16/20)+ admin(PKG-22)**:放置/三态管理/私密授权口令/到期扫描 + admin 后台(RBAC/下架/工单)
- [ ] **B3 客户端页(T17-T20)与 T0**:Unity 编辑器占用阻断(§3-E),关闭后可做
- [ ] 4 Tab 壳真机走查(APK 出包,人工)
- [ ] PKG-04/05/06(PR-1/2/3 三项真机预研)——人工主导,未开始
- [ ] client 真机出包验证(Build Settings 切 Android / Package Name / Hello 场景真机 Run)

## 3. 阻塞与待人工(编号续接用)

| # | 事项 | 影响范围 | 解法位置 |
|---|---|---|---|
| ~~A~~ | ✅ 已解(2026-08-23):Docker 镜像就位+中间件全链路验收(health/迁移/登录/赠送 80 实测通过);**拉新镜像**需 1 分钟窗口操作(server/README §6),一劳永逸方案待用户在 v2rayN 开 Allow LAN | 日常开发无影响 | server/README.md §6 |
| ~~B~~ | ✅ 已解(2026-08-23):Unity 6000.0.82f1 已装(`D:\Unity\`),工程验证通过 | — | 命令行验证法已写入 client/README.md §2 |
| C | 真机预研 PR-1(锚定)/PR-2(高德 SDK)/PR-3(Meshy 连通) | 决定锚定/地图/生成实现方案与 RA-2/3/4 复审卡(Meshy 适配器、AMapBridge 真瓦片均留桩等待) | 需 ≥3 台 ARCore 机型 |
| D | 阿里云 ECS/RDS/OSS 开通、微信开放平台资质、ICP/算法备案、Meshy key | 上线轨道(不阻塞开发);OSS 未开通前生成产物为 mock key 占位(O-4)、上传端点占位(E-1) | work/AGENTS.md §3 人工环节清单 |
| **E** | **本会话(6)人工待验清单**:①Unity 关闭后跑 T0 批处理验证 + T17-T20 客户端页;②B2/B3 服务端 e2e 复核(脚本:scripts/e2e-gen.py、e2e-b2.py、e2e-b3.py、sse-demo.sh,均可重复执行);③admin 后台走查(pnpm dev + seed-admin.ts 演示账号);④各批次 DoD 补签字(dev-log 已登记数据) | 客户端 T17-T20 与真机走查 | 用户已授权「无需签字即可推进」,本行集中记录待人工事项 |

## 4. 下一步开工清单

> **闲时(自主)任务队列已建:[IDLE_TASKS.md](./IDLE_TASKS.md)** ——T0~T25 按序领取,含批次闸门/验收标准/不可自动清单;交互会话同样优先消化该队列。

**优先级 1:客户端解锁(依赖用户关闭 Unity 编辑器)**
- T0:Unity 关闭 → client/README §2 批处理跑 EditMode 全量(含 AppShellTests);
- T17-T20:钱包页/我的内容三 Tab/生成流程页/地图层骨架(服务端端点全部就绪,见 IDLE_TASKS §2 阶段 2 的端点对照);
- 人工:Unity 打开 client → 菜单「VR留念→工程设置→创建 Main 场景」→ Play 走查 4 Tab 壳。

**优先级 2:B2/B3 人工复核(可随时)**
- 服务端 e2e 复核脚本(均可重复执行):`bash scripts/sse-demo.sh` / `python scripts/e2e-gen.py [--cancel]` / `python scripts/e2e-b3.py`(需先 seed 锚点+起 worker);
- admin 走查:`node scripts/seed-admin.ts` → server 起 api → admin/ `pnpm dev` → deviceId admin-demo-0001 登录;
- dev-log 三行批次数据补签字。

**优先级 3:B4/B5(T22-T25,锁定至 B3 客户端完成+复核)**
- 足迹点赞/商店社区/运营工具/评论——服务端可先行部分见 IDLE_TASKS 阶段 3。

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
| 已踩坑 | ① Prisma 关系字段反向缺失会 P1012;② TS enum 成员不能单独命名导入;③ pnpm 11 拦截 postinstall 需 allowBuilds(server 与 admin 两处 pnpm-workspace.yaml 都要配;package.json 的 pnpm 字段已不读);④ Bootstrap 不能放 Core(循环依赖),已独立 VRM.Bootstrap;⑤ C# 数字分隔符字面量易错数量级(Conv 偏心率曾写成 6.69e-4,靠基准单测拦下);⑥ npmmirror 缺 @nestjs/jwt@10.2.2,用 10.2.0;⑦ spec 桩需自带事务回滚语义(快照还原法);⑧ Docker Desktop 把系统代理注入 dockerd 独立网络命名空间(隔离回环不可达),settings-store manual 配置对注入无效、wc.dat 有旧缓存——拉新镜像走 server/README §6 窗口流程;⑨ Ubuntu WSL 的 postgres 经 mirrored 网络占用 5432 回环 → 本地 PG 端口 55432,连接串用 127.0.0.1 勿用 localhost(IPv6 优先会超时);⑩ prisma migrate dev 非交互终端必须带 --name(且交互检查会直接拒绝非 TTY:用 migrate diff 生成 SQL → 手工建迁移目录 → migrate deploy 的非交互流);⑪ PG advisory lock 残留 → 重启 vrm-postgres 容器;⑫ JWT 守卫把 req.user 换成 User 对象,控制器取 sub 会得到 undefined;⑬ **migrate diff --from-schema-datasource 会把 PostGIS 补丁列/索引当漂移生成 DROP**(geog 列被 DROP 实证)——PostGIS 能力已并入迁移链 20260823000000_postgis,后续 diff 一律以迁移链为基线;⑭ **PG 事务内语句失败即中止(25P02),P2002 catch 里继续查同事务必炸**——幂等复核改为事务外预查/补查(Token/Points 双服务同构修复);⑮ 全局信封拦截器/异常过滤器会污染 SSE 流(headers 已发出不可再设)——@SkipEnvelope() + headersSent 防线;⑯ class-validator 的 @Min/@Max 是数值校验,字符串长度用 @MinLength;⑰ Git Bash 管道传中文 JSON 会转码损坏,中文入参 e2e 一律走 python 脚本(UTF-8) |

## 6. 会话记录索引

| 会话 | 日期 | 内容 | 产出/提交 |
|---|---|---|---|
| 1 | 2026-08-22 | 规划+初始化+Sprint-0 AI 侧地基(server 全绿/client 源码/规范文档/推送) | 396693c |
| 2 | 2026-08-22 | 建立 PROGRESS.md 断点续接机制 | 5bb4dfb |
| 3 | 2026-08-23 | client Unity 验证(编译 0 error + 15/15 单测,修 Conv 常量 bug);B1 服务端:PKG-13 Token 账本全套 + PKG-08 auth(游客/微信/JWT)+ SSE 骨架 + auth_identities schema;52 用例全绿 | 8b3130f |
| 4 | 2026-08-23 | PKG-09 客户端基础面:A-2 App 壳(TabBar 四格+凸起相机钮/A-701 豁免)、A-3 AuthSession 游客登录对接、A-4 设备分级、A-6 贴纸组件库+设计令牌、Editor 建场景菜单;EditMode 30/30(修 3 个编译错:Graphic 私有 API/圆形网格/UIVertex 大小写/结构体 as) | f2cf669 |
| 5 | 2026-08-23 | Docker 环境修复+PKG-08/13 运行时验收:定位三层根因(系统代理注入独立 netns/wc.dat 缓存/Ubuntu WSL 占 5432),镜像就位,首次迁移+PostGIS 落库,health/guest 登录/赠送 80/幂等全链路 curl 实测通过;修 token.controller CurrentUser 字段 bug;本地 PG 端口改 55432 | (本次提交) |
| 6 | 2026-08-23 | **B1 收尾+B2 全部+B3 服务端/admin 大会话**(用户授权豁免签字闸门):T1 业务表 8 张+迁移链修复(postgis 并入)、T2 SSE 双实例 demo(修信封污染 SSE)、T3 频控件、T4-T6 geo 三接口(P95 12ms)、T7-T9 生成网关全链路(mock,取消@40%退36)、T10-T13 机审/同意/举报/积分/防刷打卡、T14-T16 放置/私密口令/生命周期、T21 admin(服务端+web);122 单测 + 4 套 live e2e 全 PASS;T0/T17-T20 因 Unity 占用顺延(§3-E) | 7 个提交(e8f25d4…9dc5983) |
