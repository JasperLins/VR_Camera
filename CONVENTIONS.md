# CONVENTIONS — 全栈编码规范(必读)

| 版本 | 日期 | 作者 | 说明 |
|---|---|---|---|
| v1.0 | 2026-08-22 | AI 开发代理 | Sprint-0 工程地基随附;修订需登记 work/dev-log.md |

> **适用对象**:人 + AI 开发代理。本文件是代码层的唯一规范入口;需求/技术/UI 规格见 `work/docs/`(只读)。
> **冲突裁决**:本文件与 `work/docs/` 规格冲突时,以 work/docs/ 为准并上报监督者,禁止就地改规格。

---

## 0. 决策红线(代码层不可违背,摘自移交包)

| 红线 | 编号 | 说明 |
|---|---|---|
| 零购买按钮/零充值入口 | D-023 | 套餐页(S23)仅「即将开放」态;任何页面不得出现购买/支付实装 |
| Token 只显示数值 | D-029 | Token 不折算人民币展示;余额不足只引导「赠送获取途径」 |
| 生成价 60 Token/次、注册赠 80 | D-047/049 | 常量收敛到共享包,禁止散落硬编码 |
| 积分单向抵扣 | D-009 | 积分不可购 3D 生成;仅商店下载按 10 积分=1 Token 抵扣 |
| 全链 WGS84 | D-006 | 服务端零 GCJ-02;唯一转换点在 `client/Assets/_Project/Map/Conv.cs` |
| 敏感权限逐项单独同意 | D-031 | 相机/定位/相册各自独立弹窗,不得打包一次同意 |
| 分享水印二维码 | D-021 | 文案「扫码回到这里」 |
| 密钥不入库 | — | API key / .env 实值只进环境变量;`*.env.example` 只放占位符 |
| work/ 只读 | — | `work/`(除 dev-log.md 台账)为规格区,代码不得反向修改规格 |

---

## 1. 仓库布局铁律

```
VR_Camera/
├── work/      # 规格:需求/技术/UI 文档 + 32 屏原型。只读(dev-log.md 除外)
├── client/    # Unity 6 + AR Foundation Android 客户端(前端)
├── server/    # NestJS monorepo:apps/api + apps/worker + packages/*(后端)
└── admin/     # AntD Pro 管理后台(B3/PKG-22 批次开发)
```

1. **前后端分离**:client 与 server 无共享运行时;契约唯一载体 = OpenAPI(server 导出)→ 客户端生成/对照,禁止手写两份漂移的接口定义。
2. **公共代码先抽后写**:
   - 服务端跨 app 复用 → `server/packages/shared`(类型/枚举/错误码)与 `server/packages/database`(Prisma);
   - 客户端跨模块复用 → `client/Assets/_Project/Core`、`Networking`、`UI`(通用组件基类);
   - **新建任何文件前先查上述共享区是否已有实现;禁止复制粘贴改名的重复代码**。发现重复 → 抽取到共享区再引用。
3. **分层单向依赖**(两侧一致):
   - server:`apps/*` → `packages/*`;`packages` 之间仅 `database` 可被业务引用,不得反向;
   - client:`VRM.Core` 为底座;Networking/UI/Map/AR 依赖 Core,彼此不横向依赖;Tests 依赖全部。

---

## 2. 文件头职责注释(强制,每个源码文件必带)

模板(TS 置于文件首行,C# 置于 using 之前):

```ts
/**
 * 职责:一句话说明本文件做什么、在架构中的位置
 * 关联需求:FR-xx(无则写「工程基建」)
 * 关联任务:PKG-xx(对应 work/docs/03-requirements/feature-list.md 子任务)
 */
```

```csharp
// 职责:一句话说明
// 关联需求:FR-xx | 关联任务:PKG-xx
```

配套要求:每个目录内有 `README.md` 说明「本目录装什么、文件如何划分」(一句话/文件),让读者看目录即懂结构。

---

## 3. 命名规范

| 对象 | 规则 | 示例 |
|---|---|---|
| TS 文件 | kebab-case | `token-ledger.service.ts` |
| TS 类 | PascalClass | `TokenLedgerService` |
| NestJS 模块目录 | `modules/<domain>/`,内含 `*.module.ts / *.controller.ts / *.service.ts / dto/` | `modules/ledger/` |
| C# 类/文件 | PascalCase 且文件名=类名 | `AnchorProvider.cs` |
| C# 接口 | `I` 前缀 | `IAnchorProvider` |
| Unity asmdef | `VRM.<Layer>` | `VRM.Networking` |
| 数据库表/列 | snake_case,表名复数 | `token_ledger.idempotency_key` |
| 枚举值 | SCREAMING_SNAKE(TS)/Pascal(C#) | `GEN_TASK_STATUS.GENERATING` |
| 环境变量 | SCREAMING_SNAKE,前缀分组 | `DB_*` `REDIS_*` `JWT_*` |
| Git 分支 | `feat/<pkg>-<slug>`、`fix/<slug>` | `feat/pkg13-token-ledger` |

---

## 4. 服务端(NestJS)统一契约

### 4.1 响应包(所有 API 统一,由全局拦截器落装)

```jsonc
// 成功
{ "code": 0, "message": "ok", "data": { }, "requestId": "uuid" }
// 失败
{ "code": 40101, "message": "人可读信息", "data": null, "requestId": "uuid" }
```

- `code=0` 表成功;非 0 为业务错误码,分段:40000 参数 / 40100 认证 / 40300 权限 / 40400 资源 / 40900 冲突(余额不足、状态机非法迁移)/ 50000 服务端内部。
- 错误码枚举唯一来源:`server/packages/shared/src/error-codes.ts`。
- HTTP 状态码与业务码同时正确(参数错→400,未认证→401…),由全局异常过滤器统一映射,业务代码只抛 `BizException`。

### 4.2 模块结构(每个业务域一致)

```
modules/<domain>/
├── <domain>.module.ts        # 模块装配
├── <domain>.controller.ts    # 路由与 Swagger 注解,不写业务逻辑
├── <domain>.service.ts       # 业务逻辑(纯逻辑尽量抽 <domain>.logic.ts 便于单测)
└── dto/                      # 入参/出参 DTO + class-validator 装饰
```

### 4.3 数据访问

- 只用 Prisma(`packages/database`);禁止裸 SQL 字符串拼接(原生地理查询用 `prisma.$queryRaw` + 参数占位符)。
- **写操作必须带幂等键**(Token 账本、生成任务);账本表只插入不更新。
- 事务边界在 service 层(`prisma.$transaction`),controller 不感知。

### 4.4 配置

- 环境变量经 `config/env.ts`(zod)校验,缺配/错配**启动即失败**;
- 新增配置 = 改 `.env.example` + 改 env schema + README 登记,三处同步。

---

## 5. 客户端(Unity)统一契约

- 页面一律继承 `Page` 基类、经 `PageRouter` 注册路由;禁止场景直跳(AR 全屏会话除外,见 A-701 TabBar 豁免)。
- 网络访问一律经 `IApiClient`(自动注入鉴权/统一错误映射/重试);禁止组件内裸 `UnityWebRequest`。
- 坐标转换唯一入口 `Conv.Wgs84ToGcj02 / Gcj02ToWgs84`;其他任何位置出现转换算法即为违例。
- UI 还原基准 = `work/UI/` 32 屏原型 + `work/docs/05-uiux/ui-spec.md` 色板组件;AR 交互以浮层态屏 + FR 一句线双基准。
- 设备分级(高/中/低)配置在 `Core/AppConfig`,渲染相关模块读取使用,禁止散落判断。

---

## 6. 测试要求

| 项 | 要求 |
|---|---|
| 范围 | 核心纯逻辑单测行覆盖 ≥70%(DoD 硬指标):坐标转换/账本幂等与原子扣减/任务状态机/geohash 聚合/防刷规则 |
| 服务端 | Jest;`*.spec.ts` 与被测文件同目录;纯逻辑抽 `.logic.ts` 不依赖 DB 即可测 |
| 客户端 | NUnit EditMode 测试在 `Assets/_Project/Tests/`;真机测试(Ignore NUnit)归人工批次 |
| 提交前 | server:lint + test + build 全绿;禁绿提交视为未完成 |

---

## 7. Git 规范

- 提交信息:Conventional Commits + 批次标签,如 `feat(pkg13): token ledger atomic deduction` / `fix(pkg07): conv inverse precision` / `chore(sprint0): bootstrap workspace`。
- 一个任务包(PKG-xx)一批次一提交组;禁止跨批次混提。
- 远程:`git@github.com:JasperLins/VR_Camera.git`;分支默认 `main`。

---

## 8. AI 开发代理工作流(提高生成质量与一致性)

1. **动笔前**:读本文件 + 相关批次的 feature-list 子任务行 + 对应 UI 原型屏。
2. **新建文件前**:先检索共享区(server/packages、client Core/UI)可复用组件。
3. **写完自查**:文件头注释 ✓ 命名规范 ✓ 无重复实现 ✓ 测试 ✓ lint/build 绿 ✓。
4. **每批次完成**:登记 `work/dev-log.md`(实耗 token/代码行/DoD 结果)。
5. **发现规格矛盾或缺口**:停止并上报,不得改规格迁就代码(AGENTS.md §2.2)。
