# client/ — VR 留念 Android 客户端(Unity 6 + AR Foundation)

> 前端 App 工程。32 屏 UI 还原基准 = `work/UI/index.html` + `work/docs/05-uiux/ui-spec.md`(只读)。
> 当前状态:**Sprint-0 工程地基源码已就绪,等待安装 Unity 编辑器后首次打开验证**。

## 1. Unity 版本与安装(首次必读)

| 项 | 要求 |
|---|---|
| Unity 版本 | **6000.0.82f1**(Unity 6 LTS,见 `ProjectVersion.txt`;已安装于 `D:\Unity\6000.0.82f1`,装后锁定不追新) |
| 安装渠道 | Unity Hub 官方中国站(unity.cn / unity.com),登录后 Install Editor → 6000.0.35f1 |
| 必勾模块 | **Android Build Support 全套**:Android SDK & NDK Tools + OpenJDK |
| 可选模块 | 简体中文语言包 |

## 2. 首次打开步骤

1. Unity Hub → Open → Add project from disk → 选择本 `client/` 目录;
2. 首次打开 Unity 会自动:解析 `Packages/manifest.json`(AR Foundation 6 等)→ 生成 `.meta` 与 `ProjectSettings` → 编译全部 asmdef;
3. **验证清单(DoD)**:
   - [x] Console 无编译错误(2026-08-23 批处理验证通过);
   - [x] EditMode 测试 15/15 全绿(北京基准 Δ<1e-9、回环 <1e-6、境外直通、偏移区间、信封契约);
   - [ ] `File → Build Settings` 切 Android 平台无报错(需 GUI 手动);
   - [ ] `Player Settings` 设置 Package Name(建议 `com.vrmemento.app`),Minimum API Level 按真机矩阵;
   - [ ] 真机 Run 一份 Hello 场景(New Scene → Build And Run)确认出包链路通。

命令行批处理验证(可重复执行,CI 可用):

```bash
# 编译检查
"D:/Unity/6000.0.82f1/Editor/Unity.exe" -batchmode -nographics -projectPath <client路径> -quit -logFile compile.log
# EditMode 测试(结果看 editmode-results.xml,退出码 0=全过)
"D:/Unity/6000.0.82f1/Editor/Unity.exe" -batchmode -nographics -projectPath <client路径> -runTests -testPlatform EditMode -testResults results.xml -logFile test.log
```

## 3. 目录结构与逐文件说明

```
client/
├── ProjectVersion.txt          Unity 编辑器版本锁定(6000.0.35f1)
├── Packages/manifest.json      UPM 依赖:AR Foundation 6 / ARCore / XR Management / InputSystem / Newtonsoft
└── Assets/_Project/            业务代码根(下划线前缀保证排序置顶)
    ├── Bootstrap/              进程装配层
    ├── Core/                   基础设施层
    ├── Networking/             网络层
    ├── Auth/                   登录会话层(A-3)
    ├── UI/                     页面与通用组件层(含 AppShell 壳与四个占位页)
    ├── Map/                    地图与坐标层
    ├── AR/                     AR 锚定层
    ├── Editor/                 编辑器工具(建 Main 场景菜单)
    └── Tests/                  EditMode 单测
```

分层依赖(单向,禁止反向/横向):

```
Bootstrap ──→ Networking ──→ Core
    │  └────→ UI ─────────→ Core
    ├───────→ Map ────────→ Core
    ├───────→ AR ────────→ Core + Map
    └───────→ Auth ──────→ Core + Networking
Tests ──→ 全部
```

### 各模块文件功能速查

| 模块 | 文件 | 功能 |
|---|---|---|
| **Bootstrap** | `Bootstrap.cs` | 进程入口:设备分级(A-4)→ API 客户端(A-5)→ 登录会话注入(A-3)→ 静默游客登录(失败不阻断启动) |
| **Core** | `AppEnvironment.cs` | 运行环境枚举(dev/test/prod) |
| | `AppConfig.cs` | 配置单例:环境/API 基地址/设备渲染档位;支持命令行 `-vrmenv -vrmapi` 覆盖 |
| | `ServiceRegistry.cs` | 轻量服务注册表:模块解耦粘合点,支持测试替换与清场 |
| | `GlobalCoroutineRunner.cs` | 全局协程宿主(DontDestroyOnLoad),供静态上下文发起协程 |
| | `DeviceTierDetector.cs` | 设备分级(A-4):内存/CPU → 高/中/低,纯函数可单测,启动时写入 AppConfig |
| **Networking** | `IApiClient.cs` | API 客户端抽象:Get/Post/Put/Delete,全部网络访问唯一入口 |
| | `ApiResult.cs` | 调用结果载体:Ok/Code/Message/Data/RequestId,与服务端信封一一对应 |
| | `ApiClientOptions.cs` | 客户端配置:基地址/超时/重试次数/退避基数 |
| | `IAuthTokenProvider.cs` | 鉴权令牌提供方接口(AuthSession 实现) |
| | `UnityApiClient.cs` | UnityWebRequest 实现:统一信封解析、鉴权注入(SetAuthProvider)、指数退避重试 |
| **Auth** | `AuthDtos.cs` | 登录 DTO:与 /v1/auth 信封 data 一一对应 |
| | `AuthSession.cs` | 登录会话(A-3):游客静默登录(幂等)/令牌缓存/退出;实现 IAuthTokenProvider |
| | `AuthStorage.cs` | 存储抽象:IAuthStorage + PlayerPrefs 实现(测试可注入内存版) |
| **UI** | `Page.cs` | 页面基类:OnShow/OnHide + PushToStack(返回栈)+ ShowsTabBar(A-701 豁免) |
| | `PageRouter.cs` | 页面路由与页面栈:NavigateTo/Back + Navigated 事件(壳据切 TabBar) |
| | `StickerTheme.cs` | 贴纸设计令牌唯一来源:色板/圆角/描边/阴影/字号(ui-spec §7 代码化) |
| | `StickerUi.cs` | 贴纸构建助手:墨描边块/硬阴影/标签/文本按钮(组件视觉统一出口) |
| | `GradientImage.cs` | 顶点渐变 Graphic(霓虹强调三处专用);isCircle 生成圆形渐变网格 |
| | `RoundedSpriteFactory.cs` | 运行时圆角/圆形精灵生成与缓存(九宫格,免美术占位) |
| | `UIService.cs` | UI 服务门面:Toast 入口,实现可替换(日志版→贴纸视觉版) |
| | `AppShell/UIShell.cs` | 壳静态入口:根 Canvas 引用与 TabBar 显隐控制 |
| | `AppShell/TabBarSpec.cs` | TabBar 规格数据(4 格顺序/相机槽位/默认页),与视图分离可单测 |
| | `AppShell/TabBarView.cs` | TabBar 视图:白底/顶墨线/激活珊瑚贴纸块/中央凸起渐变相机钮/底部指示条 |
| | `AppShell/AppShell.cs` | App 壳(A-2):场景加载后自动建根 Canvas+页面注册+TabBar+TabBar 豁免联动 |
| | `Components/StickerToastService.cs` | 贴纸 Toast(墨边白卡自动淡出) |
| | `Components/LoadingOverlay.cs` | 加载态遮罩(半透明墨色+胶囊) |
| | `Components/EmptyState.cs` | 空态组件:大 emoji+标题+引导+动作按钮(E1-E26 统一样式) |
| | `Pages/MapHomePage.cs` | 地图首页占位(S3,FR-01;真实地图 PKG-11) |
| | `Pages/StoreHomePage.cs` | 商店占位(S26,FR-09;PKG-24) |
| | `Pages/ProfileHomePage.cs` | 我的占位(S30;PKG-20/21/23) |
| | `Pages/ArCameraEntryPage.cs` | AR 相机入口占位(S5,深色舞台+TabBar 豁免;PKG-12) |
| **Map** | `GeoPoint.cs` | WGS84 经纬度结构体(全客户端坐标统一类型) |
| | `Conv.cs` | **CONV 坐标转换适配器(D-006 全客户端唯一转换点)**:WGS84↔GCJ-02 正逆变换 + 境内判定 + Haversine 距离 |
| **AR** | `AnchorMode.cs` | 锚定模式枚举:GpsCompass(MVP 基线)/ Geospatial(预留) |
| | `IAnchorProvider.cs` | 锚定提供方抽象 + AnchorProviderStatus + DeviceGeoPose(设备地理位姿) |
| | `GpsCompassAnchorProvider.cs` | GPS+罗盘降级锚定骨架(传感器接线在 PKG-12/PR-1b 后) |
| | `GeospatialAnchorProvider.cs` | Geospatial 锚定骨架(AR Foundation API 在 PKG-12/PR-1a 后接入) |
| | `AnchorService.cs` | 双模式选择器:VPS 可用走 Geospatial,否则自动降级 GPS+罗盘(D-022) |
| **Editor** | `ProjectSetupMenu.cs` | 菜单「VR留念→工程设置→创建 Main 场景并加入构建」(一键出可跑场景;根名用中文是刻意的——Unity 6 会把纯 ASCII 顶层菜单名当包名解析并丢弃) |
| **Tests** | `ConvTests.cs` | CONV 单测:北京公开基准比对(1e-9)、杭/京回环(<1e-6)、境外直通、偏移量区间 |
| | `ServiceRegistryTests.cs` | 服务注册表行为单测 |
| | `ApiEnvelopeParseTests.cs` | 信封解析契约单测(与服务端 @vrm/shared 防漂移) |
| | `DeviceTierDetectorTests.cs` | 设备分级边界表单测 |
| | `AuthSessionTests.cs` | 登录会话单测:游客登录/幂等/失败/退出/设备标识稳定 |
| | `TabBarSpecTests.cs` | TabBar 规格单测:4 格布局/相机槽位/A-701 豁免/主题色值锁定 |

每个模块目录内有独立 README 说明该层边界与扩展方式。

## 4. 关键设计决策(为什么这么分)

1. **为什么 Conv 单独一个静态类**:D-006 要求全链 WGS84、唯一转换点在客户端地图显示层。集中一个无状态类 + 单测基准,任何别处出现转换算法都可视作违例。
2. **为什么 Bootstrap 独立程序集**:它是唯一允许「依赖所有层」的装配点;放在 Core 会造成循环引用。
3. **为什么网络层先做信封解析**:服务端统一 `{code,message,data,requestId}`(见 `server/packages/shared`),客户端在 A-5 阶段就锁死契约,后续 27 个页面类任务包直接复用,不再各写解析。
4. **为什么 AR 层只有接口与骨架**:Sprint-0 预研 PR-1a/1b(真机)未做,传感器滤波方案选型未定;先把双模式切换的「缝」留好是 tech-stack §7.1 的既定架构。

## 5. 当前进度与下批次任务

**已完成(B1/PKG-09 部分)**:A-2 App 壳(AppShell+TabBar 四格+中央凸起相机,运行时自动装配)、A-3 登录对接(AuthSession 游客静默登录+令牌注入)、A-4 设备分级检测、A-6 贴纸组件库(Toast/加载态/空态/设计令牌)。

**首次运行 Play 模式步骤**:Unity 编辑器 → 菜单 `VR留念 → 工程设置 → 创建 Main 场景并加入构建` → Play。应看到:暖白底地图页(空态卡)+ 底部四格 TabBar(地图高亮、中央渐变相机钮)+ 点击 Tab 切页 + 相机页深色全屏(无 TabBar)。

**剩余(B1 后与 B2+)**:
- 真实页面替换:B3(地图 PKG-11/生成流程 PKG-15/放置 PKG-16/打卡 PKG-19/管理 PKG-20/钱包 PKG-21)、B4(商店/足迹);
- AR 相机会话(PKG-12,依赖 PR-1 真机预研);
- 图标:FontAwesome 字体导入替换 emoji 占位(A-732);字体:思源黑体导入替换内置回退(B1 视觉走查);
- 微信登录 SDK(资质人工环节就绪后接入 AuthSession)。

## 6. 常见问题

- **打开后 AR Foundation 报版本不存在**:打开 `Window → Package Manager` 检查 XR 包是否解析成功;必要时手动更新到 6.0.x 最新补丁(锁定大版本)。
- **测试跑不了**:确认 `Window → General → Test Runner` 的 EditMode 页签(不是 PlayMode)。
- **真机 AR 不可用**:国行无 GMS 机型可能装不上 ARCore(dev-environment.md §4),换 ARCore 支持机型。
