// 职责:进程启动入口——按固定顺序装配服务(网络层/登录会话/设备分级),早于任何场景加载执行
// 关联任务:PKG-01(A-1)+ PKG-09(A-3/A-4);后续批次在此追加:地图 SDK/AR 锚定服务
// 分层说明:本类是唯一允许横跨各层的装配点,故独立于 VRM.Bootstrap 程序集(依赖所有层,被无人依赖)
using System.Threading.Tasks;
using UnityEngine;
using VRM.Auth;
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
            // 1. 设备分级(A-4):渲染相关模块按档位降级
            DeviceTierDetector.ApplyFromDevice();

            // 2. 网络层:统一 API 客户端(鉴权注入/重试/错误映射,A-5)
            var apiClient = new UnityApiClient(new ApiClientOptions
            {
                BaseUrl = $"{AppConfig.ApiBaseUrl}/v1"
            });

            // 3. 登录会话(A-3):游客静默登录,令牌自动注入后续请求
            var session = new AuthSession(apiClient, new PlayerPrefsAuthStorage());
            apiClient.SetAuthProvider(session);
            ServiceRegistry.Register<IApiClient>(apiClient);
            ServiceRegistry.Register(session);

            // 4. UI 服务:Toast 等默认实现(A-6;AppShell 就绪后升级贴纸视觉版)
            UIService.ResetToDefaults();

            Debug.Log($"[Bootstrap] env={AppConfig.Environment} api={AppConfig.ApiBaseUrl} tier={AppConfig.Tier}");
            FireAndForgetGuestLogin(session);

            Debug.Log("[Bootstrap] services ready");
        }

        /// <summary>静默游客登录(失败不阻断启动:游客仅浏览场景可离线进入,重试由业务页触发)</summary>
        private static async void FireAndForgetGuestLogin(AuthSession session)
        {
            try
            {
                if (session.IsLoggedIn)
                {
                    return;
                }
                var result = await session.EnsureGuestLoginAsync();
                Debug.Log(result != null
                    ? $"[Bootstrap] guest login ok: user={result.user.id} new={result.isNewUser}"
                    : "[Bootstrap] already logged in");
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[Bootstrap] guest login deferred: {ex.Message}(后端未启动时正常,进入可浏览态)");
            }

            await Task.CompletedTask;
        }
    }
}
