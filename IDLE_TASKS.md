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

### 阶段 0:B1 收尾(闸门:无,立即可做)

- [ ] **T0 AppShell 白屏修复的批处理验证**(client):跑 Unity EditMode 全量(含新增 AppShellTests),失败则修到绿。验收:全绿 + Console 无 error。
- [ ] **T1 L-2 业务表补全**(server):anchor_grants(私密授权名单)/share_tokens(口令哈希)/reports(举报工单)/moderation_records(审核留痕)/points_accounts + points_ledger(积分账本,只插入+幂等)建模 + 迁移落地。验收:`prisma migrate dev` 无 drift,`migrate deploy` 幂等。
- [ ] **T2 SSE 多实例互通 demo**(server):`scripts/sse-demo.sh`:两 API 实例(3000/3001)→ `redis-cli publish vrm:task:t1` → 断言两个 `/v1/tasks/t1/events` 均收到。验收:脚本可重复执行全绿(PKG-08 L-6 验收线)。
- [ ] **T3 频控基础件**(server):common/rate-limit(Redis 固定窗口,按 userId+路由键)+ 守卫封装 + 单测。验收:单测绿,可被 S-1/P-4 复用。

### 阶段 1:B2 服务端核心引擎 ⛔闸门:B1 DoD 签字(未签字则停在 T3 后等待)

- [ ] **T4 M-1 附近内容接口**(server):modules/geo:`ST_DWithin`(参数化 $queryRaw)+ 海拔 ±5m + 可见性过滤 + 分页;seed 脚本(1 万锚点,杭州湖滨中心)+ P95 计时脚本。验收:本地 P95 <500ms 数字记 dev-log;过滤逻辑纯函数单测。
- [ ] **T5 M-2 geohash 聚合**(server):geohash 编码纯函数(精度 1-7)+ zoom 分级 + cell/count/top_content 聚合接口。验收:聚合纯函数单测 ≥70% + 本地 DB e2e。
- [ ] **T6 M-3 热门区域聚合**(server):区域密度 Top N 接口(打卡数暂以锚点数代理,S-1 落地后切换)。
- [ ] **T7 O-1+O-6 生成网关服务层**(server):Gen3DProvider TS 接口 + 任务创建(扣 Token 同事务/幂等 `gen-debit:taskId`)+ 状态机守卫(复用 canTransition)+ 标签→参数映射(结构化枚举,禁 prompt 字符串)。验收:并发创建幂等单测 + 非法迁移拒绝单测。
- [ ] **T8 O-3 Worker 消费骨架**(server):generation.worker:BullMQ 消费 → **mock provider**(可配时延/失败率)→ 进度 Redis 发布(vrm:task:id)→ 终态退款(调 TokenService 既有 credit;O-4 真实资金终态属人工批次)。验收:mock 全链路集成测试(创建→进度→完成/失败退款/取消比例退)。
- [ ] **T9 生成任务端点**(server):POST /v1/gen/tasks、GET /v1/gen/tasks/:id(轮询兜底)、取消(比例退款 computeCancelRefund)。验收:e2e(mock provider)。
- [ ] **T10 R-1+R-5 机审与同意留痕**(server):ContentSafetyProvider 抽象 + mock 适配器(配置化敏感词)+ 统一入口;协议版本表 + 单独同意记录接口(D-031)。验收:单测。
- [ ] **T11 Q-5+R-4 举报与 AI 标识**(server):reports 状态机(受理→复核→处置,48h SLA 字段)+ 举报接口;锚点/任务的 AI 生成标识字段下发。验收:状态机单测。
- [ ] **T12 P-3 积分服务**(server):六类获取入账/单向抵扣 10:1(复用只插入+幂等账本模式)+ 余额接口。验收:并发幂等单测。
- [ ] **T13 P-4+S-1 防刷与打卡**(server):防刷纯函数规则集(同内容一次/最低字数/新号冷却/每日上限/设备指纹)+ 打卡上报(+2/同锚点每日首次/日上限 10)。验收:规则全表单测(PKG-18 验收线)。

### 阶段 2:B3 体验闭环 ⛔闸门:B2 DoD 签字

- [ ] **T14 N-1+N-3 放置与管理接口**(server):放置校验(坐标/可见性/失效枚举 7d/30d/永久,私密默认永久)+ 隐藏/重开恢复原位/删除(30 天回收字段)。验收:e2e + 私密仅授权可见单测。
- [ ] **T15 N-4 私密鉴权与口令**(server):授权名单判定 + 口令生成/校验(哈希存储)。验收:单测。
- [ ] **T16 N-2 生命周期调度实现**(server):lifecycle-scan.worker 真实实现(部分索引扫描→到期隐藏→留痕)+ BullMQ repeat。验收:过期数据注入式单测。
- [ ] **T17 K-1/K-2/K-4 钱包页**(client):wallet-home(S22)/token-packages(S23 四档「即将开放」,D-023 零购买)/ledger-detail(S24);Token 只显数值(D-029)。还原 work/UI 原型。验收:EditMode + 留人工走查清单。
- [ ] **T18 G-1~G-3 我的内容管理页**(client):三 Tab(可见/已隐藏/已删除)+ 隐藏/重开/删除确认。
- [ ] **T19 E-1~E-3+E-5 生成流程页**(client):gen-upload(≤10MB/≥512 校验)/人脸单独同意弹窗(拒绝阻断)/gen-config(标签)/gen-result(进度+保存);上传端点占位(OSS STS 属人工)。验收:页面流转 + EditMode。
- [ ] **T20 地图层骨架**(client):详情卡(B-6)/空区三出口(B-7)/热门区域列表(B-8)/聚合胶囊(B-5 数据侧);高德 SDK 留桩 AMapBridge(真瓦片待 PR-2+key)。验收:桩数据驱动渲染 + EditMode。
- [ ] **T21 U-1~U-3 admin 后台**(web):AntD Pro 脚手架 + 登录 RBAC(复用服务端 JWT)+ 内容管理/强制下架 + 审核工作流页。验收:`pnpm build` 绿 + 路由守卫演示账号。

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
