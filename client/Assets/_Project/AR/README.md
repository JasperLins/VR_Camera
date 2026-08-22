# AR — AR 锚定层

装什么:AnchorMode(双模式枚举)、IAnchorProvider 抽象、GPS+罗盘与 Geospatial 两个 Provider 骨架、AnchorService(自动降级选择器)。
状态:Sprint-0 只立「缝」;传感器接线与 AR Foundation API 接入在 PKG-12(B2),方案取决于 PR-1a/1b 真机预研结论。
扩展:新增锚定能力只加 Provider 实现,不动接口与服务端数据模型(锚点不存模式专有句柄)。
