// 职责:进程启动入口——按固定顺序装配服务(网络层/UI 服务),早于任何场景加载执行
// 关联任务:PKG-01(A-1);后续批次在此追加:定位服务/地图 SDK/AR 锚定服务的注册
// 分层说明:本类是唯一允许横跨各层的装配点,故独立于 VRM.Bootstrap 程序集(依赖所有层,被无人依赖)
using UnityEngine;
using VRM.Core;
using VRM.Networking;
using VRM.UI;

namespace VRM.Bootstrap
{
    public static class Bootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Initialize()
        {
            Debug.Log($"[Bootstrap] env={AppConfig.Environment} api={AppConfig.ApiBaseUrl} tier={AppConfig.Tier}");

            // 1. 网络层:统一 API 客户端(鉴权注入/重试/错误映射,A-5)
            var apiClient = new UnityApiClient(new ApiClientOptions
            {
                BaseUrl = $"{AppConfig.ApiBaseUrl}/v1"
            });
            ServiceRegistry.Register<IApiClient>(apiClient);

            // 2. UI 服务:Toast 等通用组件的默认实现(A-6 基类先行,视觉按 UI 原型在 B1 落地)
            UIService.ResetToDefaults();

            Debug.Log("[Bootstrap] services ready");
        }
    }
}
