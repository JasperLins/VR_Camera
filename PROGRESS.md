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

## 1. 当前断点(最近一次更新:2026-08-22)

| 项 | 状态 |
|---|---|
| 位置 | **Sprint-0 AI 侧完成,等 3 件人工环境事后进 B1**(也可先开 B1 服务端部分,见 §4) |
| git | 已推送 `origin/main`(提交 396693c + 本文件提交) |
| server | ✅ lint / test(29 用例)/ build 全绿;中间件运行时验证被 Docker 代理问题阻断(§5-A) |
| client | ⏳ 源码就绪(24 个 C# + 17 个 EditMode 单测),**未验证**——待装 Unity 打开后跑验证清单(client/README.md §2) |
| admin | 未开工(规划 B3/PKG-22,见 admin/README.md) |

## 2. 已完成清单(勾选项为「已实现且已验证」)

- [x] 仓库初始化:client/server/admin 三区 + 根规范文件(.gitignore/.editorconfig/CONVENTIONS/README)
- [x] PKG-02(L-1 服务端工程地基):NestJS 10 monorepo,lint/test/build 三门禁全绿
- [x] PKG-01(A-1 客户端工程地基)**源码部分**:7 个 asmdef 分层 + Bootstrap 装配 + 单测代码
- [x] PKG-03(L-4 云上部署)**本地部分**:docker-compose(PG16+PostGIS/Redis7)+ .env 模板;云端开通属人工
- [x] PKG-07(B-2 坐标转换)**草案**:Conv.cs + Node 基准验算 PASS(北京公开基准 Δ=2e-12,回环 <1e-6);真机验收(PR-1c)未做
- [x] Prisma schema v1(users/token_accounts/token_ledger/gen_tasks/anchors)+ PostGIS 幂等补丁(001_postgis.sql)
- [x] packages/shared:env 校验/业务常量/错误码/生成任务状态机/信封契约(24 用例)
- [x] 说明文档体系:根/server/client/admin README + 9 个模块级 README(逐文件功能表)
- [ ] PKG-04/05/06(PR-1/2/3 三项真机预研)——**人工主导,未开始**
- [ ] client Unity 打开验证(装机后按 client/README.md §2 五项清单)

## 3. 阻塞与待人工(编号续接用)

| # | 事项 | 影响范围 | 解法位置 |
|---|---|---|---|
| A | Docker Desktop 代理(127.0.0.1:10808)WSL2 内不可达,镜像拉不下来 | 中间件运行时验证、迁移、health 验收 | server/README.md §6(三选一方案) |
| B | Unity 未安装 | client 一切验证、PKG-09 后续 | 装 6000.0.35f1 + Android Build Support,client/README.md §1-2 |
| C | 真机预研 PR-1(锚定)/PR-2(高德 SDK)/PR-3(Meshy 连通) | 决定 B2 锚定/地图/生成实现方案与 RA-2/3/4 复审卡 | 需 ≥3 台 ARCore 机型;依赖 B 装机 |
| D | 阿里云 ECS/RDS/OSS 开通、微信开放平台资质、ICP/算法备案、Meshy key | B1 末期联调与上线轨道(不阻塞开发) | work/AGENTS.md §3 人工环节清单 |

## 4. 下一步开工清单(B1 批次:PKG-08 / 09 / 13,18.5 人日)

> 进入条件:无硬阻塞——服务端两项(08/13)不依赖 Unity,可立即开工;PKG-09 依赖事项 B。

**PKG-08 数据与基础设施(6 人日,L-2/L-3/L-5/L-6)**:
- L-2:packages/database/prisma/schema.prisma 补全业务表(好友授权/私密口令/举报工单/审核记录),生成迁移;
- L-5:apps/api `modules/auth/`(游客登录 + 微信校验占位,JWT 签发;微信 AppSecret 属人工,先 mock);
- L-6:apps/api `modules/sse/`(Redis pub/sub → SSE 端点 `/v1/tasks/:id/events` 骨架)+ worker 联动 demo;
- 验收:迁移可重放;登录通;SSE 多实例互通 demo。

**PKG-13 Token 账本(3.5 人日,P-1/P-2)**:
- `modules/ledger/`:token.service(注册赠 80 入账、原子扣减、全额/比例退款)+ ledger.logic.ts 纯逻辑 + 幂等键单测(并发扣减、重复请求);
- P-2 支付网关**仅状态机占位不接支付**(D-023 红线);
- 验收:并发扣减幂等单测绿。

**PKG-09 客户端基础面(9 人日,依赖装 Unity)**:
- A-2:4 Tab App 壳(还原 work/UI/map-home 等;TabBar 豁免 A-701);A-3 登录对接 L-5;A-4 设备分级探测填充 AppConfig.SetDeviceTier;A-6 通用组件贴纸视觉版(色板 ui-spec §7.1)。

**B1 DoD 提醒**:构建绿 + 核心纯逻辑覆盖 ≥70% + 原型走查 + P0 一句线录屏 + 缺陷清零 + dev-log 登记。

## 5. 环境事实(已探明,新会话直接引用)

| 项 | 值 / 说明 |
|---|---|
| Node | v24.19.0(nvm4w;文档口径 20 LTS,实测兼容,已登记 dev-log) |
| pnpm | 11.7.0;**构建脚本白名单在 pnpm-workspace.yaml allowBuilds**(新增带安装脚本的依赖要加白名单) |
| Docker | 28.3.2 守护进程可起;镜像拉取被代理问题阻断(§3-A) |
| Unity | 未安装;目标版本 6000.0.35f1(ProjectVersion.txt 已写) |
| git 远程 | git@github.com:JasperLins/VR_Camera.git(main 分支) |
| 版本锁定 | NestJS 10 / Prisma 5.22 / BullMQ 5 / TS 5.6 / zod 3 / AR Foundation 6.0.3 |
| 常用命令 | server/:pnpm i · pnpm -r lint/test/build · pnpm db:up · pnpm migrate:dev · pnpm dev(详见 server/README.md §2) |
| 已踩坑 | ① Prisma 关系字段反向缺失会 P1012;② TS enum 成员不能单独命名导入;③ pnpm 11 拦截 postinstall 需 allowBuilds;④ Bootstrap 不能放 Core(循环依赖),已独立 VRM.Bootstrap |

## 6. 会话记录索引

| 会话 | 日期 | 内容 | 产出/提交 |
|---|---|---|---|
| 1 | 2026-08-22 | 规划+初始化+Sprint-0 AI 侧地基(server 全绿/client 源码/规范文档/推送) | 396693c |
| 2 | 2026-08-22 | 建立 PROGRESS.md 断点续接机制 | (本次提交) |
