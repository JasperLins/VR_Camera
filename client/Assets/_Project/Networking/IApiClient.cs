// 职责:API 客户端抽象——所有网络访问的唯一入口,禁止组件内裸用 UnityWebRequest
// 关联任务:PKG-09(A-5 网络层:鉴权/重试/错误统一注入)
// 契约:服务端统一信封 {code,message,data,requestId}(server/packages/shared/api-response.ts)
using System.Threading.Tasks;

namespace VRM.Networking
{
    public interface IApiClient
    {
        Task<ApiResult<T>> GetAsync<T>(string path);

        Task<ApiResult<T>> PostAsync<T>(string path, object body);

        Task<ApiResult<T>> PutAsync<T>(string path, object body);

        Task<ApiResult<bool>> DeleteAsync(string path);
    }
}
