# UI — 页面与通用组件层

装什么:Page 基类(32 屏统一抽象)、PageRouter(页面栈导航)、UIWidget/UIService(通用组件基类与门面)。
边界:页面间禁止互相引用,NavigateTo(pageId, param) 是唯一跳转方式;TabBar 豁免屏(S1/S2/S5-S20/S32)见 ui-spec A-701。
扩展:B1 按原型补 4 Tab 壳与贴纸视觉组件;新页面继承 Page 并在启动时 Register。
