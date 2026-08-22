// 职责:登录会话单测——游客登录/令牌缓存/退出/幂等(A-3);IApiClient 与存储均为内存替身
// 关联任务:PKG-09
using System.Threading.Tasks;
using NUnit.Framework;
using VRM.Auth;
using VRM.Networking;

public class AuthSessionTests
{
    /// <summary>内存存储替身</summary>
    private sealed class MemoryStorage : IAuthStorage
    {
        private readonly System.Collections.Generic.Dictionary<string, string> _map =
            new System.Collections.Generic.Dictionary<string, string>();

        public string Get(string key) => _map.TryGetValue(key, out var v) ? v : string.Empty;
        public void Set(string key, string value) => _map[key] = value;
        public void Remove(string key) => _map.Remove(key);
    }

    /// <summary>API 客户端替身:记录调用并按预设返回</summary>
    private sealed class FakeApiClient : IApiClient
    {
        public int GuestLoginCalls;
        public ApiResult<AuthResultDto> NextResult = ApiResult<AuthResultDto>.Success(
            new AuthResultDto
            {
                token = "jwt-1",
                isNewUser = true,
                user = new UserInfoDto { id = "u-1", nickname = "游客", role = "USER" }
            },
            "rid-1");

        public Task<ApiResult<T>> GetAsync<T>(string path) => Task.FromResult(default(ApiResult<T>));
        public Task<ApiResult<T>> PostAsync<T>(string path, object body)
        {
            GuestLoginCalls++;
            // ApiResult<T> 是结构体,经 object 装箱后强转回目标泛型(仅 auth/guest 用到)
            if (typeof(T) == typeof(AuthResultDto))
            {
                return Task.FromResult((ApiResult<T>)(object)NextResult);
            }
            return Task.FromResult(default(ApiResult<T>));
        }
        public Task<ApiResult<T>> PutAsync<T>(string path, object body) => Task.FromResult(default(ApiResult<T>));
        public Task<ApiResult<bool>> DeleteAsync(string path) => Task.FromResult(default(ApiResult<bool>));
    }

    [Test]
    public async Task 首次游客登录_保存令牌与用户ID()
    {
        var api = new FakeApiClient();
        var session = new AuthSession(api, new MemoryStorage());

        var result = await session.EnsureGuestLoginAsync();

        Assert.AreEqual("jwt-1", await session.GetTokenAsync());
        Assert.AreEqual("u-1", session.UserId);
        Assert.IsTrue(session.IsLoggedIn);
        Assert.AreEqual(1, api.GuestLoginCalls);
        Assert.IsTrue(result.isNewUser);
    }

    [Test]
    public async Task 已登录时不重复请求()
    {
        var api = new FakeApiClient();
        var session = new AuthSession(api, new MemoryStorage());

        await session.EnsureGuestLoginAsync();
        var second = await session.EnsureGuestLoginAsync();

        Assert.IsNull(second, "已登录时应直接返回 null");
        Assert.AreEqual(1, api.GuestLoginCalls, "幂等:不重复调用登录接口");
    }

    [Test]
    public async Task 登录失败_抛异常且不落令牌()
    {
        var api = new FakeApiClient
        {
            NextResult = ApiResult<AuthResultDto>.Failure(50001, "后端未启动", "rid-2")
        };
        var storage = new MemoryStorage();
        var session = new AuthSession(api, storage);

        Assert.ThrowsAsync<System.InvalidOperationException>(() => session.EnsureGuestLoginAsync());
        Assert.IsFalse(session.IsLoggedIn);
    }

    [Test]
    public async Task 退出登录_清令牌保留设备标识()
    {
        var api = new FakeApiClient();
        var storage = new MemoryStorage();
        var session = new AuthSession(api, storage);

        var deviceId = session.DeviceId;
        await session.EnsureGuestLoginAsync();
        session.Logout();

        Assert.IsFalse(session.IsLoggedIn);
        Assert.AreEqual(string.Empty, await session.GetTokenAsync());
        Assert.AreEqual(deviceId, session.DeviceId, "设备标识保留,下次游客登录复用账号");
    }

    [Test]
    public async Task 设备标识_首次生成后稳定()
    {
        var session = new AuthSession(new FakeApiClient(), new MemoryStorage());

        var first = session.DeviceId;
        Assert.AreEqual(first, session.DeviceId);
        Assert.IsNotEmpty(first);
        await Task.CompletedTask;
    }
}
