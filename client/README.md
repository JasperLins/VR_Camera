# client/ — VR 留念 Android 客户端(Unity 6 + AR Foundation)

> 前端 App 工程。32 屏 UI 还原基准 = `work/UI/index.html` + `work/docs/05-uiux/ui-spec.md`(只读)。
> 当前状态:**Sprint-0 工程地基源码已就绪,等待安装 Unity 编辑器后首次打开验证**。

## 1. Unity 版本与安装(首次必读)

| 项 | 要求 |
|---|---|
| Unity 版本 | **6000.0.35f1**(Unity 6 LTS,见 `ProjectVersion.txt`;装后锁定不追新) |
| 安装渠道 | Unity Hub 官方中国站(unity.cn / unity.com),登录后 Install Editor → 6000.0.35f1 |
| 必勾模块 | **Android Build Support 全套**:Android SDK & NDK Tools + OpenJDK |
| 可选模块 | 简体中文语言包 |

## 2. 首次打开步骤

1. Unity Hub → Open → Add project from disk → 选择本 `client/` 目录;
2. 首次打开 Unity 会自动:解析 `Packages/manifest.json`(AR Foundation 6 等)→ 生成 `.meta` 与 `ProjectSettings` → 编译全部 asmdef;
3. **验证清单(DoD)**:
   - [ ] Console 无编译错误(0 error);
   - [ ] `Window → General → Test Runner → EditMode` 全绿(共 17 个用例:Conv 基准/回环、服务注册表、信封解析);
   - [ ] `File → Build Settings` 切 Android 平台无报错;
   - [ ] `Player Settings` 中设置 Package Name(建议 `com.vrmemento.app`),Minimum API Level 按真机矩阵;
   - [ ] 真机 Run 一份 Hello 场景(New Scene → Build And Run)确认出包链路通。

## 3. 目录结构与逐文件说明

```
client/
├── ProjectVersion.txt          Unity 编辑器版本锁定(6000.0.35f1)
├── Packages/manifest.json      UPM 依赖:AR Foundation 6 / ARCore / XR Management / InputSystem / Newtonsoft
└── Assets/_Project/            业务代码根(下划线前缀保证排序置顶)
    ├── Bootstrap/              进程装配层
    ├── Core/                   基础设施层
    ├── Networking/             网络层
    ├── UI/                     页面与通用组件层
    ├── Map/                    地图与坐标层
    ├── AR/                     AR 锚定层
    └── Tests/                  EditMode 单测
```

分层依赖(单向,禁止反向/横向):

```
Bootstrap ──→ Networking ──→ Core
    │  └────→ UI ─────────→ Core
    ├───────→ Map ────────→ Core
    └───────→ AR ────────→ Core + Map
Tests ──→ 全部
```

### 各模块文件功能速查

| 模块 | 文件 | 功能 |
|---|---|---|
| **Bootstrap** | `Bootstrap.cs` | 进程入口:注册 IApiClient(按环境拼 /v1 基地址)、重置 UI 服务;早于场景加载执行 |
| **Core** | `AppEnvironment.cs` | 运行环境枚举(dev/test/prod) |
| | `AppConfig.cs` | 配置单例:环境/API 基地址/设备渲染档位;支持命令行 `-vrmenv -vrmapi` 覆盖 |
| | `ServiceRegistry.cs` | 轻量服务注册表:模块解耦粘合点,支持测试替换与清场 |
| | `GlobalCoroutineRunner.cs` | 全局协程宿主(DontDestroyOnLoad),供静态上下文发起协程 |
| **Networking** | `IApiClient.cs` | API 客户端抽象:Get/Post/Put/Delete,全部网络访问唯一入口 |
| | `ApiResult.cs` | 调用结果载体:Ok/Code/Message/Data/RequestId,与服务端信封一一对应 |
| | `ApiClientOptions.cs` | 客户端配置:基地址/超时/重试次数/退避基数 |
| | `IAuthTokenProvider.cs` | 鉴权令牌提供方(登录模块 A-3 就绪前的接缝) |
| | `UnityApiClient.cs` | UnityWebRequest 实现:统一信封解析、鉴权注入、指数退避重试(网络层失败才重试) |
| **UI** | `Page.cs` | 页面基类:OnShow(param)/OnHide 生命周期 + PageId 路由标识 |
| | `PageRouter.cs` | 页面路由与页面栈:NavigateTo/Back,禁止场景直跳 |
| | `UIWidget.cs` | 通用组件基类:CanvasGroup 显示/隐藏骨架 |
| | `UIService.cs` | UI 服务门面:Toast 等入口,实现可替换(默认为日志版,B1 换贴纸视觉版) |
| **Map** | `GeoPoint.cs` | WGS84 经纬度结构体(全客户端坐标统一类型) |
| | `Conv.cs` | **CONV 坐标转换适配器(D-006 全客户端唯一转换点)**:WGS84↔GCJ-02 正逆变换 + 境内判定 + Haversine 距离 |
| **AR** | `AnchorMode.cs` | 锚定模式枚举:GpsCompass(MVP 基线)/ Geospatial(预留) |
| | `IAnchorProvider.cs` | 锚定提供方抽象 + AnchorProviderStatus + DeviceGeoPose(设备地理位姿) |
| | `GpsCompassAnchorProvider.cs` | GPS+罗盘降级锚定骨架(传感器接线在 PKG-12/PR-1b 后) |
| | `GeospatialAnchorProvider.cs` | Geospatial 锚定骨架(AR Foundation API 在 PKG-12/PR-1a 后接入) |
| | `AnchorService.cs` | 双模式选择器:VPS 可用走 Geospatial,否则自动降级 GPS+罗盘(D-022) |
| **Tests** | `ConvTests.cs` | CONV 单测:北京公开基准比对(1e-9)、杭/京回环(<1e-6)、境外直通、偏移量区间 |
| | `ServiceRegistryTests.cs` | 服务注册表行为单测 |
| | `ApiEnvelopeParseTests.cs` | 信封解析契约单测(与服务端 @vrm/shared 防漂移) |

每个模块目录内有独立 README 说明该层边界与扩展方式。

## 4. 关键设计决策(为什么这么分)

1. **为什么 Conv 单独一个静态类**:D-006 要求全链 WGS84、唯一转换点在客户端地图显示层。集中一个无状态类 + 单测基准,任何别处出现转换算法都可视作违例。
2. **为什么 Bootstrap 独立程序集**:它是唯一允许「依赖所有层」的装配点;放在 Core 会造成循环引用。
3. **为什么网络层先做信封解析**:服务端统一 `{code,message,data,requestId}`(见 `server/packages/shared`),客户端在 A-5 阶段就锁死契约,后续 27 个页面类任务包直接复用,不再各写解析。
4. **为什么 AR 层只有接口与骨架**:Sprint-0 预研 PR-1a/1b(真机)未做,传感器滤波方案选型未定;先把双模式切换的「缝」留好是 tech-stack §7.1 的既定架构。

## 5. Sprint-0 之后本工程的下批次任务(B1/PKG-09)

- A-2 App 壳:4 Tab + 相机凸起(TabBar 规范 ui-spec A-701,首页 map-home);
- A-3 登录:微信 SDK + 游客态(密钥人工环节);
- A-4 设备分级检测(填充 `AppConfig.SetDeviceTier`);
- A-6 通用组件库视觉版:按 ui-spec「珊瑚贴纸潮玩」还原 Toast/弹窗/加载/空态。

## 6. 常见问题

- **打开后 AR Foundation 报版本不存在**:打开 `Window → Package Manager` 检查 XR 包是否解析成功;必要时手动更新到 6.0.x 最新补丁(锁定大版本)。
- **测试跑不了**:确认 `Window → General → Test Runner` 的 EditMode 页签(不是 PlayMode)。
- **真机 AR 不可用**:国行无 GMS 机型可能装不上 ARCore(dev-environment.md §4),换 ARCore 支持机型。
