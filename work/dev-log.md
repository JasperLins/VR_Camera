# dev-log — 批次运行台账(开发代理每批必填)

> 用途:记录每批实耗 token/轮次/代码量/DoD 结果,回填主项目 `memory/outputs-index.md`,校准 A-615(token/行 366 中值)与 A-616(输入:输出=85:15)。不登记=批次未完成。

| 批次 | 日期 | 任务包 | 实耗 token(输入/输出/合计) | 会话轮次 | 新增有效代码行(含单测) | DoD 结果(一次通过/修复后通过/回滚) | 监督者签字 | 备注(假设校验/预案触发) |
|---|---|---|---|---|---|---|---|---|
| Sprint-0(部分) | 2026-08-22 | PKG-01(源码)/PKG-02/PKG-03(本地)/PKG-07(单测草案) | 会话台账待回填 | — | 约 1,900(server+client+文档) | 修复后通过:server lint/test(29)/build 全绿;client 待 Unity 打开验证 | 待签 | 必附:三项预研书面结论 → **未出**(真机项待人工,见下) |
| B1(大部分完成) | 2026-08-23 | PKG-13(全)、PKG-08 L-5/L-6(auth+SSE+schema+运行时验收)、PKG-09 A-2/A-3/A-4/A-6(App 壳+登录对接+分级+组件库) | 会话台账待回填 | — | 约 2,800(累计) | 修复后通过:server lint/test(52)/build 绿+**运行时全链路实测**(health 200/游客登录/赠 80/幂等);client 编译 0 error + EditMode 30/30 | 待签 | B1 剩余:L-2 业务表补全、SSE 多实例 demo、真机走查;Docker 环境已修(server/README §6),修 token.controller 用户字段 bug 1 个 |
| B2(AI 侧完成,2026-08-23 会话 6) | 2026-08-23 | PKG-10(M-1/2/3)/PKG-14(O-1/3/6+端点)/PKG-17(R-1/R-5/Q-5/R-4)/PKG-18(P-3/P-4/S-1)+ T1/T2/T3 | 会话台账待回填 | — | 约 3,900(geo/生成/安全/举报/积分/打卡 + 频控 + 脚本) | 修复后通过:lint/test/build 全绿(122 用例);**运行时实测**:SSE 双实例 demo PASS、生成全链路(扣60→SSE进度→COMPLETED)、取消@40%退36、B2 四模块 e2e 12/12、**M-1 P95=12.1ms@500m / 22.5ms@5km(1 万锚点,验收线 500ms)** | 待签 | mock provider 全链路代真(Meshy 适配器待 PR-3);D-045/D-012/D-031 口径已代码化;踩坑 2 个见 PROGRESS §5(⑬⑭) |
| B3(服务端+admin 完成,2026-08-23 会话 6) | 2026-08-23 | PKG-15/16(N-1/3/4)/PKG-20(N-2)/PKG-22(U-1~U-3 服务端+web 后台);PKG-11/19/21 客户端页未做(Unity 占用) | 会话台账待回填 | — | 约 1,700(anchors 域 + admin 端点 + admin web) | 修复后通过:e2e-b3 20/20(放置/隐藏重开删/私密授权/口令/到期隐藏);admin RBAC live 实测(普通用户 40300/下架/工单流转);admin pnpm build 绿 | 待签 | 生命周期留痕暂为结构化日志(事件表待后台看板需求);admin 正式账号体系属 B5 |
| B4 | | PKG-23~26 | | | | | | |
| B5 | | PKG-27+SIT/上架专项 | | | | | | M3 提审 2027-01-05 |

> 环境就绪标记(dev-environment.md §5 三项验收):完成日期 ______
> Sprint-0 部分交付明细(2026-08-22,AI 代理):
> - 工程地基:server monorepo(NestJS10+pnpm workspace:api/worker/shared/database)、client Unity6 源码(分层 asmdef + CONV + 单测)、admin 占位;
> - 验证:server `pnpm i/lint/test/build` 全绿;GCJ-02 算法 Node 交叉验算 PASS(北京基准 Δ=2e-12);Docker 中间件运行时验证被本机代理问题阻断(处理指引见 server/README.md §6);
> - 偏差登记:Node v24.19.0(文档口径 20 LTS,实测兼容);Unity 版本采 6000.0.35f1(移交包未锁定具体小版本,建议监督者确认);
> - **待人工环节**:①安装 Unity Hub/Editor(版本与步骤见 client/README.md);②PR-1/2/3 真机预研;③阿里云账号/ECS/RDS/OSS 开通;④微信开放平台资质/ICP 备案/Meshy key;⑤启动 Docker Desktop 代理修复后完成迁移与 health 验收。

## ⚠ 假设校验记录(按移交包假设分组,依标注时点)

| 假设 | 校验时点 | 结论(成立/不成立/降级) | 日期 | 备注 |
|---|---|---|---|---|
| PR-1 双模式锚定(漂移 ≤1m/30s、偏差 ≤10m,R1) | Sprint-0 | | | 不达标→RA-2 复审卡流程(D-022 降级基线已在口径内) |
| PR-2 高德 Unity SDK 能力(A-403) | Sprint-0 | | | 聚合不足→服务端 geohash 降级 |
| PR-3 Meshy 大陆连通(A-404) | Sprint-0 | | | 不通→切 Rodin 乙案(D-024/D-048) |
| A-402 单实例 <1 万 MAU | B1 部署时 | | | |
| A-422 生成量 1% DAU/失败率 8% | B2 上线后校准 | | | |
| A-615 token/行 366、A-616 85:15 | 每批回填对照 | | | 偏差 >30% 通知主项目 |
| 其余生效假设 | 随所属批次 | | | 见移交包假设分组表 |

## 复审卡触发记录(RA-1~RA-5,decisions.md §三)

| 复审卡 | 触发条件是否达成 | 达成日期 | 上报主项目日期 | 处置结论 |
|---|---|---|---|---|
| RA-2 锚定(预研偏差 >±5 人日升级,D-041) | | | | |
| RA-3 充值+高德许可决策包 | | | | |
| RA-4 定价(Meshy→Rodin 切换后) | | | | |
