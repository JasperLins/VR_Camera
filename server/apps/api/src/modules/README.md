# modules/ — 业务模块层

划分规则:一个业务域一个目录,内含四件套 `<domain>.module.ts / .controller.ts / .service.ts / dto/`;
纯逻辑抽 `<domain>.logic.ts` 便于无 DB 单测。新模块必须在 app.module.ts 注册。
当前:health / auth(B1)/ ledger(B1)/ sse(B1);后续:geo/content/generation/moderation(B2 起)。
