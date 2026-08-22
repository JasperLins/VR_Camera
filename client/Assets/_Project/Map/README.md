# Map — 地图与坐标层

装什么:GeoPoint(WGS84 坐标结构)、Conv(WGS84↔GCJ-02 唯一转换点,D-006)。
红线:全客户端只允许 Conv 做坐标系变换;服务端与 AR 锚定全链 WGS84,仅地图显示层渲染前转 GCJ-02。
扩展:B1/PKG-11 接高德 Unity SDK 时,地图显示适配器只调用 Conv,不自带算法。
