// 职责:鉴权令牌提供方——登录态实现(微信/游客,PKG-09 A-3)就绪前的占位接口
// 关联任务:PKG-09(A-3 登录与账号);实现方负责令牌缓存与刷新
using System.Threading.Tasks;

namespace VRM.Networking
{
    public interface IAuthTokenProvider
    {
        /// <summary>返回当前访问令牌;游客态/未登录返回 null(请求头将不携带 Authorization)</summary>
        Task<string> GetTokenAsync();
    }
}
