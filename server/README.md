# server/ — VR 留念服务端(NestJS 10 monorepo)

> 后端工程:pnpm workspace 管理 2 个应用 + 2 个共享包,TypeScript 单语言栈(tech-stack 方案 A)。
> 当前状态:**Sprint-0 工程地基完成,lint / test(29 用例)/ build 全绿**;中间件运行时验证待环境就绪(见 §6)。

## 1. 目录结构与逐文件说明

```
server/
├── package.json               workspace 根:聚合脚本(dev/build/test/lint/migrate/db:up)
├── pnpm-workspace.yaml        包清单(apps/* packages/*)+ pnpm 构建脚本白名单
├── tsconfig.base.json         TS 编译基线(strict + 装饰器 + CommonJS)
├── eslint.config.mjs          ESLint 9 扁平配置(全 workspace 一份)
├── .prettierrc / .prettierignore
├── docker-compose.yml         本地中间件:postgis/postgis:16-3.4 + redis:7-alpine(环境即代码)
├── .env.example               环境变量模板(实值复制为 .env,不入库)
├── apps/
│   ├── api/                   HTTP API 应用(NestJS)
│   └── worker/                后台 Worker 应用(BullMQ)
└── packages/
    ├── shared/                跨 app 共享:env 校验/常量/错误码/状态机/契约
    └── database/              Prisma schema + 迁移 + PostGIS 补丁
```

### apps/api(HTTP API,NestJS)

| 文件 | 功能 |
|---|---|
| `src/main.ts` | 进程入口:全局前缀 /v1、ValidationPipe、Swagger(/docs)、优雅停机 |
| `src/load-env.ts` | 启动前置:从 workspace 根加载 server/.env(必须是第一条 import) |
| `src/app.module.ts` | 根模块:注册全局过滤器/拦截器与业务模块(**新模块在此 imports 追加**) |
| `src/common/biz.exception.ts` | 业务异常基类:`BizException.of(code, message)`,HTTP 状态自动映射 |
| `src/common/filters/global-exception.filter.ts` | 全局异常过滤器:任何异常统一落装 `{code,message,data:null,requestId}` |
| `src/common/interceptors/envelope.interceptor.ts` | 全局信封拦截器:成功包 `{code:0,...}` + 访问日志 + x-request-id 透传 |
| `src/common/dto/pagination.dto.ts` | 分页公共 DTO:列表接口继承,禁止重复声明 page/pageSize |
| `src/common/prisma/prisma.service.ts` / `.module.ts` | 全局 Prisma 客户端(连接生命周期管理,@Global) |
| `src/common/redis/redis.module.ts` | 全局共享 ioredis 连接(探活/缓存/SSE pub-sub 用;BullMQ 自建连接) |
| `src/modules/health/health.service.ts` | DB/Redis 探活,汇总 ok/degraded(不抛异常,探针恒 200) |
| `src/modules/health/health.controller.ts` | `GET /v1/health` 路由 |
| `src/modules/health/health.module.ts` | 模块装配 |
| `*.spec.ts` | 单测:控制器委托/service 四种依赖组合 |

**请求流转**:`Request → EnvelopeInterceptor(发 requestId)→ Guard/Pipe → Controller → Service → BizException?→ GlobalExceptionFilter(错误信封)或 EnvelopeInterceptor(成功信封)→ Response`

### apps/worker(后台 Worker,BullMQ)

| 文件 | 功能 |
|---|---|
| `src/main.ts` | 入口:Redis 连接、队列声明、消费者注册、SIGINT/SIGTERM 优雅停机 |
| `src/load-env.ts` | 同 api:加载 workspace 根 .env |
| `src/workers/lifecycle-scan.worker.ts` | 生命周期到期扫描占位(FR-06/PKG-20,B3 填真实逻辑) |

B2 将新增:`workers/generation.worker.ts`(PKG-14 生成任务消费:轮询 Meshy → 进度 Redis 发布 → SSE 转发 → 产物转存 OSS → 终态退款删照片)。

### packages/shared(跨 app 共享,B1 起客户端契约对照源)

| 文件 | 功能 |
|---|---|
| `src/env.ts` | zod 环境变量校验(非法即启动失败;本地默认值与 docker-compose 同构) |
| `src/constants.ts` | 业务常量唯一来源:Token 经济(60/次、赠 80、10 积分=1 Token)、打卡规则(+2/日上限 10)、地理默认(500m/5km/±5m)、队列名 |
| `src/error-codes.ts` | AppErrorCode 分段注册表 + HTTP 映射(40901=Token 不足等,全站唯一) |
| `src/gen-task-state.ts` | 生成任务状态机:7 态枚举 + 合法迁移表 + canTransition 纯函数(tech-stack §7.1 状态图) |
| `src/api-response.ts` | 信封契约类型:ApiResponse/PageQuery/PageResult(客户端 ParseEnvelope 对照) |
| `src/*.spec.ts` | 单测 24 例:状态机全路径、常量守卫、错误码映射、env 防线 |

### packages/database(数据访问)

| 文件 | 功能 |
|---|---|
| `prisma/schema.prisma` | 核心表 v1:users / token_accounts / **token_ledger(只插入+幂等键)** / gen_tasks(状态机枚举)/ anchors(WGS84 经纬度+海拔+状态) |
| `prisma/sql/001_postgis.sql` | PostGIS 补丁(幂等):postgis 扩展 + anchors.geog 生成列 + GiST 索引 + 生命周期部分索引 |
| `src/index.ts` | 出口:重导出 Prisma Client(apps 只经本包访问 DB) |

表设计要点:权威余额只在 `token_accounts`(A-405);流水只插入不更新;锚点坐标 WGS84(D-006),geography 生成列由经纬度自动计算,业务写入无感知。

## 2. 命令手册(都在 server/ 目录执行)

| 命令 | 作用 |
|---|---|
| `pnpm install` | 安装全部依赖(含 prisma generate) |
| `pnpm db:up` / `pnpm db:down` | 起/停本地中间件(PG16+PostGIS / Redis7) |
| `pnpm migrate:dev` | 生成并应用 Prisma 迁移(开发) |
| `pnpm migrate:deploy` | 部署迁移 + 执行 PostGIS 补丁(生产) |
| `pnpm db:patch` | 单独执行 PostGIS 补丁(幂等可重复) |
| `pnpm dev` | 起 api(3000)+ worker(需中间件已起) |
| `pnpm build` / `pnpm test` / `pnpm lint` | 三大门禁(DoD 构建绿) |
| `pnpm db:studio` | Prisma Studio 数据浏览 |

## 3. 环境变量(.env)

复制 `.env.example` 为 `.env` 后按需修改;新增变量必须同步 env.ts + .env.example + 本 README(三处同步,CONVENTIONS §4.4)。

| 变量 | 默认 | 说明 |
|---|---|---|
| `NODE_ENV` | development | development/test/production |
| `API_PORT` | 3000 | API 监听端口 |
| `LOG_LEVEL` | info | debug/info/warn/error |
| `DATABASE_URL` | 本地 docker 同构值 | 生产为阿里云 RDS(必须显式注入) |
| `REDIS_URL` | redis://localhost:6379 | 生产为云数据库 Redis |

## 4. 版本锁定(不追新,AGENTS.md 纪律)

NestJS 10.x / Prisma 5.22 / BullMQ 5.x / TS 5.6 / Jest 29 / ESLint 9 / zod 3。升级须在 dev-log 登记理由。

## 5. 新增业务模块 SOP(B1 起反复使用)

1. `apps/api/src/modules/<domain>/` 建 module/controller/service/dto 四件套(命名见 CONVENTIONS §3);
2. 错误码先在 shared/error-codes.ts 登记,再 `BizException.of(...)` 抛出;
3. Prisma 建模改 packages/database(地理能力追加走 prisma/sql 补丁);
4. 纯逻辑抽 `<domain>.logic.ts` + 同目录 spec(覆盖率 ≥70%);
5. app.module.ts imports 注册,swagger tag 命名与模块一致。

## 6. 已知环境阻塞(2026-08-22 登记,待处理后删除本节)

Docker Desktop 代理配置指向 `127.0.0.1:10808`,WSL2 内守护进程无法回连宿主回环地址,镜像拉取失败
(`proxyconnect tcp: dial tcp 127.0.0.1:10808: connect: connection refused`)。**服务端代码本身不受影响(单测/构建全绿)**。

处理任选其一后,依次执行:`pnpm db:up && pnpm migrate:dev && pnpm db:patch && pnpm dev`,验收 `curl http://localhost:3000/v1/health` 返回 `{"code":0,...,"dependencies":{"db":"up","redis":"up"}}`:

1. 代理软件开启「允许来自局域网的连接」(绑定 0.0.0.0),并把 Docker Desktop 代理改为 `http://<本机IP>:10808`;
2. 或在方便重启 WSL 时执行 `wsl --shutdown` 使 `.wslconfig` 的 `networkingMode=mirrored` 生效(注意会终止所有 WSL 发行版,含 Ubuntu);
3. 或为 Docker 配置国内镜像加速并关闭代理。
