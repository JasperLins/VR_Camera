# VR 留念(vr-memento)开发环境准备指南(Windows)

| 版本 | 日期 | 状态 | 作者 |
|---|---|---|---|
| v1.0 | 2026-08-22 | 已确认 | 项目经理 |

> 目标:本地装好下列环境后,`work/` 里的 Unity 工程 + NestJS monorepo 可一次构建通过、真机可 AR 调试。技术依据:`docs/08-handoff/ai-dev-handoff.md` §2(Unity + AR Foundation / NestJS 10 + Prisma / PostgreSQL 16 + PostGIS / Redis 7 + BullMQ / AntD Pro;阿里云部署)。
> 预计总磁盘占用:约 25–35 GB;全程需联网,国内网络按 §6 配镜像。

## 1. 必装清单(按顺序)

### 1.1 Unity Hub + Unity LTS(客户端核心)
- **装什么**:Unity Hub(官方中国站可直连)+ **Unity LTS 版本(以移交包 §2 锁定为准,装完勿追新)**;
- **装后模块勾选(必)**:**Android Build Support** 全套——Android SDK & NDK Tools、OpenJDK;如需 iOS 二期再补 Xcode(Windows 上不装);
- **验证**:Unity Hub 能创建空 Android 工程,File → Build Settings 切 Android 平台出包无报错。

### 1.2 Android 真机调试组件
- Unity Hub 装的 Android SDK/NDK 已含 adb;如需独立管理可另装 Android Studio(`developer.android.google.cn` 可直连),SDK Platform 与 Build-Tools 由 Unity 模块自带优先;
- 手机开启「开发者选项 + USB 调试」,`adb devices` 能列出设备;
- **真机要求:ARCore 支持机型 ≥3 台自备**(D-054;机型清单见 Google ARCore supported-devices 页,国行无 GMS 机型注意 A-205 覆盖率风险,Sprint-0 PR-1 一并实测)。

### 1.3 Node.js 20 LTS + pnpm(服务端/后台)
- **装什么**:Node.js **20 LTS**(nodejs.org 或 npmmirror 镜像)+ `corepack enable && corepack prepare pnpm@latest --activate`;
- **验证**:`node -v` 显示 20.x;`pnpm -v` 正常;`pnpm config set registry https://registry.npmmirror.com`(国内镜像)。

### 1.4 Docker Desktop(本地中间件)
- **装什么**:Docker Desktop for Windows(WHPX 虚拟机平台,控制面板启用);
- **装后配置**:导入 `server/` 下 docker-compose(PostgreSQL 16 + PostGIS 镜像 + Redis 7 镜像);国内配镜像加速器;
- **验证**:`docker compose up -d` 后 `psql` 能连 PostGIS(`SELECT postgis_version();` 有输出)、`redis-cli ping` 返回 PONG。

### 1.5 Git(应已具备)
- 版本 ≥2.30;`git --version` 验证。开发仓库即 `work/`(`.gitignore` 已配好 Unity + Node 双栈)。

### 1.6 账号与密钥(人工环节,开发前办妥)
- 阿里云账号(ECS/RDS/OSS;L-4);
- 微信开放平台开发者账号(移动应用资质审核周期长,**与 Sprint-0 并行立即提交**);
- Meshy 付费档账号(API key;Sprint-0 PR-3 大陆连通实测,不通切 Rodin,D-024);
- 高德开放平台企业认证个人开发者 key(Unity SDK;A-403 POC)。

## 2. 环境即代码

- 中间件拓扑以 `server/docker-compose*.yml` 为唯一事实源(本地=生产同构:PG16+PostGIS、Redis7);
- 环境变量 `.env.local` 模板入库、实值不入库(密钥红线,见 .gitignore)。

## 3. Windows 虚拟化(仅 Docker/模拟器需要)

控制面板 → 程序 → 启用 Windows 功能:**「虚拟机平台」**;BIOS 确认 VT-x/AMD-V 已开。Unity AR 运行时**不支持模拟器做 AR 实测**,AR 一律真机(模拟器仅用于非 AR 的 UI 布局联调)。

## 4. 常见坑(本项目特定)

1. **坐标系**:全链 WGS84,仅客户端地图层转 GCJ-02(D-006,唯一转换点 CONV 适配器);本地调试用真实经纬度样本,勿手造 GCJ-02 假数据。
2. **ARCore 大陆可用性**:国行无 GMS 机型可能装不上 ARCore APK——真机选型时每台先验 `ARCore supported` 并记录(PR-1 输入)。
3. **Unity → Android 出包签名**:debug keystore 默认即可,Release 签名属人工环节。
4. **Meshy 大陆连通**:若直连超时,先查 ECS 出口再查本地(Sprint-0 结论决定主备供应商)。

## 5. 首次构建验收(环境装完跑一遍)

1. `client/` Unity 工程 → Android Build 出 debug APK → 真机安装启动出 Hello AR(或空场景)无 error;
2. `server/` `pnpm i && pnpm build && pnpm test` 全绿;docker compose 起 PG/Redis 后 `pnpm start:dev` 健康检查 200;
3. `admin/` `pnpm i && pnpm dev` 登录页可开。
三项全过 → 在 `dev-log.md` 备注行记录「环境就绪」,方可开 Sprint-0。
