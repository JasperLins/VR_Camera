// 职责:API 客户端配置——基地址/超时/重试策略;由 Bootstrap 按 AppConfig 环境装配
// 关联任务:PKG-09(A-5)
namespace VRM.Networking
{
    public sealed class ApiClientOptions
    {
        /// <summary>基地址(含版本前缀,如 http://localhost:3000/v1)</summary>
        public string BaseUrl { get; set; } = "http://localhost:3000/v1";

        /// <summary>单次请求超时(秒)</summary>
        public float TimeoutSeconds { get; set; } = 15f;

        /// <summary>网络层失败重试次数(业务错误不重试)</summary>
        public int MaxRetries { get; set; } = 2;

        /// <summary>重试退避基数(秒):第 n 次重试等待 BackoffBase * 2^n</summary>
        public float BackoffBaseSeconds { get; set; } = 0.5f;
    }
}
