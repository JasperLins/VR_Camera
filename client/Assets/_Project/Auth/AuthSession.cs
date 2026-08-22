// 职责:登录会话——游客登录(静默)/令牌缓存/退出;实现 IAuthTokenProvider 注入统一 API 客户端
// 关联需求:FR-07;关联任务:PKG-09(A-3 登录与账号)/ 服务端 PKG-08(L-5)
// 口径:D-030 游客仅浏览;微信登录(资质就绪后)复用同一会话骨架,替换登录端点
using System;
using System.Threading.Tasks;
using VRM.Networking;

namespace VRM.Auth
{
    public sealed class AuthSession : IAuthTokenProvider
    {
        private const string DeviceIdKey = "vrm.auth.device_id";
        private const string TokenKey = "vrm.auth.token";
        private const string UserIdKey = "vrm.auth.user_id";

        private readonly IApiClient _api;
        private readonly IAuthStorage _storage;

        public AuthSession(IApiClient api, IAuthStorage storage)
        {
            _api = api ?? throw new ArgumentNullException(nameof(api));
            _storage = storage ?? throw new ArgumentNullException(nameof(storage));
        }

        /// <summary>设备标识(首次生成 UUID 持久化;游客账号复用凭据)</summary>
        public string DeviceId
        {
            get
            {
                var id = _storage.Get(DeviceIdKey);
                if (string.IsNullOrEmpty(id))
                {
                    id = Guid.NewGuid().ToString("N");
                    _storage.Set(DeviceIdKey, id);
                }
                return id;
            }
        }

        /// <summary>当前用户 ID(未登录为空)</summary>
        public string UserId => _storage.Get(UserIdKey);

        public bool IsLoggedIn => !string.IsNullOrEmpty(_storage.Get(TokenKey));

        /// <summary>IApiClient 鉴权注入:有令牌带 Bearer,游客未登录不带</summary>
        public Task<string> GetTokenAsync()
        {
            return Task.FromResult(_storage.Get(TokenKey));
        }

        /// <summary>静默游客登录(幂等:已有令牌直接返回;失败抛出由调用方决定重试策略)</summary>
        public async Task<AuthResultDto> EnsureGuestLoginAsync()
        {
            if (IsLoggedIn)
            {
                return null; // 已登录(调用方通常直接忽略)
            }

            var result = await _api.PostAsync<AuthResultDto>("auth/guest", new GuestLoginRequest { deviceId = DeviceId });
            if (!result.Ok)
            {
                throw new InvalidOperationException($"游客登录失败: [{result.Code}] {result.Message}");
            }

            _storage.Set(TokenKey, result.Data.token);
            _storage.Set(UserIdKey, result.Data.user.id);
            return result.Data;
        }

        /// <summary>退出登录(清令牌保留设备标识;下次进入重新游客登录)</summary>
        public void Logout()
        {
            _storage.Remove(TokenKey);
            _storage.Remove(UserIdKey);
        }
    }
}
