# IDLE_TASKS — 闲时(自主)开发任务队列

> **用途**:把「AI 可独立完成、可自动验证」的开发工作排成队列;每个闲时会话从 §2 按序取**第一个未完成任务**完整执行(代码+测试+文档+提交),然后勾选并更新本文件与 PROGRESS.md。
> **来源依据**:work/docs/03-requirements/feature-list.md 的「AI 并行=是/部分」子任务 + 当前 PROGRESS.md 断点。
> **硬纪律**:批次闸门(AGENTS.md §2.1,禁止跳批)——阶段 1 起每个阶段标注闸门,**闸门未开(上一批次 DoD 未签字)就在队列该处停下**,把等待记录写进 PROGRESS.md,不得越线开发。

## 1. 执行规则(每个闲时会话必读)

1. **启动顺序**:PROGRESS.md §0 五步 → 本文件 → 取队首未完成任务;
2. **开工前**:`git pull --ff-only`(用户可能从别处提交过);
3. **完成定义**:代码 + 单测(新增纯逻辑覆盖 ≥70%)+ lint/test/build 全绿 + 文件头职责注释 + 相关 README 同步;
4. **验证命令**:server = `cd server && pnpm -r lint && pnpm -r test && pnpm -r build`;client = Unity 批处理(client/README.md §2;**前提:Unity 编辑器已关闭**,若 `client/Library/EditorInstance.json` 的 process_id 仍存活 → 该 client 任务顺延,做下一个 server 任务);admin = `pnpm build`;
5. **中间件**:已就绪(PG 127.0.0.1:55432 / Redis 6379);**禁止 docker pull**(镜像已全;需要新镜像 → 记入 PROGRESS §3 待人工窗口);
6. **外部密钥全缺**(微信/高德/Meshy/内容安全):一律 mock 或留桩,严禁编造 key;
7. **提交**:conventional commits + 任务号(如 `feat(pkg10): T4 nearby query`);推送后勾选本文件、更新 PROGRESS.md §6 会话记录;
8. **新增 npm 依赖**被 pnpm 拦构建脚本 → 在 `server/pnpm-workspace.yaml` allowBuilds 增补后重装;
9. **发现规格矛盾/缺口** → 停止该任务,记入 PROGRESS.md §3,转下一个不依赖它的任务;
10. **禁改 work/ 规格区**(仅 dev-log.md 台账行可补)。

## 2. 任务队列(按序执行)

### 阶段 0:B1 收尾(闸门:无,立即可做)—— ✅ 2026-08-23 会话 6 完成 T1-T3

- [ ] **T0 AppShell 白屏修复的批处理验证**(client):**顺延——Unity 编辑器持续占用(PID 31948,EditorInstance 锁活),批处理无法运行**;关闭 Unity 后按 client/README §2 执行。
- [x] **T1 L-2 业务表补全**(server):8 表落地(anchor_grants/share_tokens/reports/moderation_records/points_accounts+points_ledger/agreement_versions/consent_records + anchors.ai_generated);迁移 20260822180906 + PostGIS 并入迁移链 20260823000000(⚠ migrate diff --from-schema-datasource 会 DROP postgis 对象,见 PROGRESS §5 ⑬);`migrate deploy` 幂等已验证(全量 reset 重放)。
- [x] **T2 SSE 多实例互通 demo**(server):`scripts/sse-demo.sh` 可重复执行 PASS(subscribers=2);附带修复全局信封拦截器污染 SSE 流(SkipEnvelope + headersSent 防线)。
- [x] **T3 频控基础件**(server):common/rate-limit 固定窗口(Redis INCR+EXPIRE)+ @RateLimit 装饰器守卫 + 11 单测;已接入 guest 登录/checkin/报告触点。

### 阶段 1:B2 服务端核心引擎 —— ✅ 2026-08-23 会话 6 全部完成(用户明示豁免签字闸门,待人工复核项见 PROGRESS §3-E)

- [x] **T4 M-1 附近内容接口**:geo 模块 ST_DWithin 参数化查询 + 海拔 ±5m + 可见性三通道过滤;seed-anchors.ts(1 万,湖滨)+ bench-nearby.ts;**P95=12.1ms@500m / 22.5ms@5km**(记 dev-log);纯函数单测 + curl e2e。
- [x] **T5 M-2 geohash 聚合**:encode/decode 纯函数(Wikipedia 基准向量验证)+ zoom 分级 + aggregateClusters;18 单测 + e2e。
- [x] **T6 M-3 热门区域**:ST_GeoHash 密度 Top N(打卡口径待 S-1 流水落库后切换);e2e 通过。
- [x] **T7 O-1+O-6**:GenerationService(扣 60 与建任务同事务/幂等 gen-debit:taskId)+ TokenService tx 透传;标签→参数映射收敛 @vrm/shared(结构化枚举)。
- [x] **T8 O-3 Worker**:generation.processor(受理→进度→终态;FAILED/REFUNDED_ALL 全额退;DEDUCTED 停滞扫描超时退款)+ worker-token SQL 级幂等入账;6 集成测试(脚本化 provider)。
- [x] **T9 端点**:POST/GET/cancel /v1/gen/tasks;**live e2e**:全链路 SSE 帧 0/20/41/62/82/100+glbOssKey;取消@40%→退36;e2e-gen.py 可复跑。
- [x] **T10 R-1+R-5**:ContentSafetyProvider + mock(CONTENT_SAFETY_WORDS)+ 全量留痕;五项协议自举 + 同意记录/查询接口(D-031)。
- [x] **T11 Q-5+R-4**:report 状态机(受理→复核→处置 + 48h SLA/超时标记)+ 重复举报去重;anchor.ai_generated 下发(详情/geo/admin)。
- [x] **T12 P-3 积分**:PointsService(六类幂等入账 + STORE_REDEEM 年上限 2000=D-045 + 10:1 粒度 + 原子扣)。
- [x] **T13 P-4+S-1**:防刷规则引擎纯函数(5 规则全表单测 + dailyCap 覆盖)+ 打卡(+2/同锚点每日幂等/日上限 10/toast 载荷);B2 四模块 e2e-b2.py 12/12。

### 阶段 2:B3 体验闭环 —— 服务端 T14-T16 + admin T21 完成(2026-08-23 会话 6);client T17-T20 顺延(Unity 占用)

- [x] **T14 N-1+N-3 放置与管理**:POST /v1/anchors(标题机审/WGS84/7d/30d/永久,私密强制永久 D-012)+ 详情(R-4 标识)+ 三态列表 + 隐藏/重开恢复原位/软删 30 天回收(回收期恢复落 HIDDEN);e2e-b3 20/20。
- [x] **T15 N-4 私密鉴权与口令**:授权名单追加/移除(移除即重新上锁)+ 8 位数字口令(sha256 存储/重生成作废旧令)+ 校验 5 次失败冷却 10 分钟 + 24h 解锁会话;无权限完全不可见(40301)。
- [x] **T16 N-2 生命周期调度**:scanExpiredAnchors 条件批量 VISIBLE→HIDDEN + BullMQ 5 分钟 repeat;过期行实测命中(留痕=结构化日志,事件表待后台需求)。
- [ ] **T17 K-1/K-2/K-4 钱包页**(client):**顺延——Unity 编辑器占用,批处理验证不可运行**(服务端余额/流水端点已就绪:/v1/ledger/balance|entries)。
- [ ] **T18 G-1~G-3 我的内容管理页**(client):**顺延同上**(服务端三态列表/隐藏/重开/删除端点已就绪:/v1/anchors)。
- [ ] **T19 E-1~E-3+E-5 生成流程页**(client):**顺延同上**(服务端生成全链路 + 人脸同意留痕接口已就绪:/v1/gen/tasks + /v1/consents)。
- [ ] **T20 地图层骨架**(client):**顺延同上**(数据侧已就绪:/v1/geo/nearby|clusters|hot-regions)。
- [x] **T21 U-1~U-3 admin 后台**:Vite+React+AntD(AntD Pro 轻量等价实现)+ 登录 RBAC(复用 JWT,role=ADMIN)+ 内容管理/强制下架 + 工单处置流;`pnpm build` 绿 + 演示账号 seed-admin.ts(deviceId admin-demo-0001)+ live 实测(普通用户 40300/下架/流转)。

### 阶段 3:B4/B5 ⛔闸门:B3 DoD 签字(列出但默认锁定)

- [ ] **T22 PKG-23 足迹点赞**:S-2 足迹查询 / I-1~I-3 时间线+地图+打卡墙开关 / I-5 点赞 / K-3 积分页。
- [ ] **T23 PKG-24 商店社区**:Q-1 三区列表 / J-1~J-4 页面 / Q-2 上架审核流 / Q-3 下载计费周去重。
- [ ] **T24 PKG-26 运营工具**:T-1 seeding 接口 / U-5 批量放置 ≥50 锚点 / U-6 看板三指标。
- [ ] **T25 PKG-27 评论(P2)**:I-4/Q-4 单向单条/24h 修改一次/机审/公开列表。

## 3. 明确不进闲时队列(人工主导,feature-list 21 项口径 + 平台事项)

PR-1a/b/c、PR-2、PR-3 真机预研;C-1~C-4 AR 会话真机;B-2/B-3 精度与定位真机;A-3 微信 SDK 实装;F-2 三层合成真机;F-5 微信分享(资质);L-4 云上部署;O-2 Meshy 适配器实测;O-4 资金终态终审;P-2 支付通道终审;H-2/H-3 同框真机性能;Unity 真机走查/录屏;APK 签名/商店提审/ICP/算法备案/高德与微信与 Meshy key 办理;Docker 拉新镜像窗口操作。

## 4. 环境注意(闲时会话上下文)

- Unity 批处理前提:编辑器已关(锁检测见规则 4);被占用 → client 任务顺延做 server 任务;
- 本地 PG **55432** / Redis 6379,连接串一律 127.0.0.1(勿 localhost,IPv6 会超时);
- 中间件起停:`cd server && pnpm db:up / db:down`;
- API 本地起法:`node apps/api/dist/main.js`(先 build);Swagger 在 `/docs`;
- 外部依赖全 mock;数据库/Redis 可用真实实例做集成验证。
