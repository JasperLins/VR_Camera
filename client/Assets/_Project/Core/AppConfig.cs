// 职责:应用配置单例——环境切换 / API 基地址 / 设备渲染档位;后续批次扩展为 JSON 覆盖式加载
// 关联任务:PKG-01(A-1 dev-test-prod 环境分层)/ PKG-09(A-4 设备分级检测)
// 红线:密钥类配置(AppKey 等)不写入代码,由 Native 层或安全存储注入(AGENTS.md §3)
using UnityEngine;

namespace VRM.Core
{
    /// <summary>设备渲染档位(高/中/低三档,AR 层按此降级,A-4)</summary>
    public enum DeviceTier
    {
        High,
        Medium,
        Low
    }

    public static class AppConfig
    {
        /// <summary>当前运行环境;编辑器下默认 Development,由 CI 或启动参数注入覆盖</summary>
        public static AppEnvironmentKind Environment { get; private set; } = AppEnvironmentKind.Development;

        /// <summary>API 基地址(不带 /v1 前缀,由 ApiClient 拼装);生产走 CDN 同域网关</summary>
        public static string ApiBaseUrl { get; private set; } = "http://localhost:3000";

        /// <summary>设备渲染档位(启动时由 DeviceTierDetector 探测写入)</summary>
        public static DeviceTier Tier { get; private set; } = DeviceTier.Medium;

        static AppConfig()
        {
            // 编辑器/开发机构建可用命令行参数覆盖: -vrmenv=test -vrmapi=https://...
            var args = System.Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == "-vrmenv")
                {
                    System.Enum.TryParse(args[i + 1], ignoreCase: true, out AppEnvironmentKind env);
                    Environment = env;
                }
                else if (args[i] == "-vrmapi")
                {
                    ApiBaseUrl = args[i + 1];
                }
            }

            if (Environment == AppEnvironmentKind.Development && Debug.isDebugBuild == false)
            {
                Environment = AppEnvironmentKind.Production;
            }
        }

        /// <summary>PKG-09(A-4)接入后由探测结果调用;默认 Medium 待真机标定</summary>
        public static void SetDeviceTier(DeviceTier tier)
        {
            Tier = tier;
        }
    }
}
