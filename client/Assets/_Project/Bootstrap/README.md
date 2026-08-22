# Bootstrap — 进程装配层

装什么:唯一入口 Bootstrap.cs,把 Networking/UI 等层的服务按顺序注册进 ServiceRegistry。
边界:全工程唯一允许「依赖所有层」的程序集,自己不被任何程序集依赖;只做装配,不写业务。
扩展:新模块服务(定位/地图 SDK/AR 锚定)在 Initialize() 中按依赖顺序追加注册。
