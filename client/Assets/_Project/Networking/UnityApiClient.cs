// 职责:IApiClient 的 UnityWebRequest 实现——统一信封解析/鉴权注入/指数退避重试
// 关联任务:PKG-09(A-5);JSON 序列化用 Newtonsoft(com.unity.nuget.newtonsoft-json)
using System;
using System.Collections;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace VRM.Networking
{
    public sealed class UnityApiClient : IApiClient
    {
        private readonly ApiClientOptions _options;
        private readonly IAuthTokenProvider _auth;

        public UnityApiClient(ApiClientOptions options, IAuthTokenProvider auth = null)
        {
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _auth = auth;
        }

        public Task<ApiResult<T>> GetAsync<T>(string path)
        {
            return SendWithRetryAsync<T>(UnityWebRequest.kHttpVerbGET, path, null);
        }

        public Task<ApiResult<T>> PostAsync<T>(string path, object body)
        {
            return SendWithRetryAsync<T>(UnityWebRequest.kHttpVerbPOST, path, body);
        }

        public Task<ApiResult<T>> PutAsync<T>(string path, object body)
        {
            return SendWithRetryAsync<T>(UnityWebRequest.kHttpVerbPUT, path, body);
        }

        public async Task<ApiResult<bool>> DeleteAsync(string path)
        {
            // DELETE 无业务数据体:信封 code==0 即视为成功
            var raw = await SendWithRetryAsync<JObject>(UnityWebRequest.kHttpVerbDELETE, path, null);
            return raw.Ok
                ? ApiResult<bool>.Success(true, raw.RequestId)
                : ApiResult<bool>.Failure(raw.Code, raw.Message, raw.RequestId);
        }

        private async Task<ApiResult<T>> SendWithRetryAsync<T>(string verb, string path, object body)
        {
            var attempt = 0;
            ApiResult<T> last = default;

            while (true)
            {
                last = await SendOnceAsync<T>(verb, path, body);
                attempt++;

                // 仅网络层失败(长连接/CURL 错误)重试;业务错误与 HTTP 4xx 不重试
                var retriable = last.Ok == false && last.Code < 0 && attempt <= _options.MaxRetries;
                if (!retriable)
                {
                    return last;
                }

                var delay = _options.BackoffBaseSeconds * Mathf.Pow(2, attempt - 1);
                await Task.Delay(TimeSpan.FromSeconds(delay));
            }
        }

        private async Task<ApiResult<T>> SendOnceAsync<T>(string verb, string path, object body)
        {
            var url = $"{_options.BaseUrl.TrimEnd('/')}/{path.TrimStart('/')}";

            using (var request = new UnityWebRequest(url, verb))
            {
                request.timeout = Mathf.Max(1, (int)_options.TimeoutSeconds);
                request.downloadHandler = new DownloadHandlerBuffer();

                if (body != null)
                {
                    request.uploadHandler = new UploadHandlerRaw(
                        System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(body)));
                    request.SetRequestHeader("Content-Type", "application/json");
                }

                if (_auth != null)
                {
                    var token = await _auth.GetTokenAsync();
                    if (!string.IsNullOrEmpty(token))
                    {
                        request.SetRequestHeader("Authorization", $"Bearer {token}");
                    }
                }

                await SendAsync(request);

                if (request.result != UnityWebRequest.Result.Success)
                {
                    // 网络层失败统一映射为负数码,与业务码(>=40000)区分以驱动重试策略
                    return ApiResult<T>.Failure(-1, $"网络错误: {request.error}", request.GetResponseHeader("x-request-id"));
                }

                return ParseEnvelope<T>(request.downloadHandler.text);
            }
        }

        /// <summary>解析统一信封 {code,message,data,requestId};public 供 EditMode 测试直接验证契约</summary>
        public static ApiResult<T> ParseEnvelope<T>(string json)
        {
            try
            {
                var envelope = JObject.Parse(json);
                var code = envelope.Value<int?>("code") ?? -2;
                var message = envelope.Value<string>("message") ?? "未知错误";
                var requestId = envelope.Value<string>("requestId") ?? string.Empty;

                if (code != 0)
                {
                    return ApiResult<T>.Failure(code, message, requestId);
                }

                var data = envelope["data"] == null || envelope["data"].Type == JTokenType.Null
                    ? default
                    : envelope["data"].ToObject<T>();
                return ApiResult<T>.Success(data, requestId);
            }
            catch (Exception ex)
            {
                return ApiResult<T>.Failure(-2, $"响应解析失败: {ex.Message}", string.Empty);
            }
        }

        /// <summary>把 UnityWebRequest 的协程 API 包装为 Task(保留调用方同步上下文语义)</summary>
        private static Task SendAsync(UnityWebRequest request)
        {
            var completion = new TaskCompletionSource<bool>();
            static IEnumerator routine(UnityWebRequest req, TaskCompletionSource<bool> tcs)
            {
                yield return req.SendWebRequest();
                tcs.SetResult(true);
            }

            GlobalCoroutineRunner.Instance.StartCoroutine(routine(request, completion));
            return completion.Task;
        }
    }
}
