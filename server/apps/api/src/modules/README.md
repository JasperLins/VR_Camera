# modules/ — 业务模块层

划分规则:一个业务域一个目录,内含四件套 `<domain>.module.ts / .controller.ts / .service.ts / dto/`;
纯逻辑抽 `<domain>.logic.ts` 便于无 DB 单测。新模块必须在 app.module.ts 注册。

| 模块 | 批次 | 职责一句话 | 关键文件 |
|---|---|---|---|
| health | B1 | 健康检查(db/redis 探活) | health.controller.ts |
| auth | B1 | 游客/微信登录 + JWT 会话 | auth.service.ts, jwt-auth.guard.ts |
| ledger | B1 | Token 账本(原子扣减/幂等/退款) | token.service.ts, ledger.logic.ts |
| sse | B1 | Redis pub/sub → SSE 任务进度流 | sse.service.ts |
| geo | B2 | 附近内容/geohash 聚合/热门区域(PKG-10) | geo.service.ts, geohash.ts |
| generation | B2 | 生成网关(扣 Token 建任务/取消比例退,PKG-14) | generation.service.ts, dto/generation.dto.ts |
| safety | B2 | 机审统一入口 + 协议同意留痕(PKG-17) | content-safety.service.ts, agreements.service.ts |
| report | B2 | 举报工单状态机(48h SLA,PKG-17) | report.service.ts, report.logic.ts |
| points | B2 | 积分账本(六类入账/商店抵扣年上限,PKG-18) | points.service.ts, points.logic.ts |
| checkin | B2 | 打卡上报(+2/日上限 10)+ 防刷联动(PKG-18) | checkin.service.ts, anti-fraud.logic.ts |
| anchors | B3 | 放置/三态管理/私密授权/口令(PKG-15/16/20) | anchor.service.ts, anchor.logic.ts |
| admin | B3 | 管理后台端点(RBAC/强制下架/工单处置,PKG-22) | admin.controller.ts, admin.guard.ts |
