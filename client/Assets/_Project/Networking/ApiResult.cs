// 职责:API 调用结果——与服务端信封一一对应的客户端侧载体,统一错误语义
// 关联任务:PKG-09(A-5)
namespace VRM.Networking
{
    public readonly struct ApiResult<T>
    {
        /// <summary>成功标志(code == 0)</summary>
        public readonly bool Ok;

        /// <summary>服务端业务码(0 成功;非 0 见服务端 AppErrorCode 分段)</summary>
        public readonly int Code;

        /// <summary>人可读消息(失败时展示给用户)</summary>
        public readonly string Message;

        /// <summary>业务数据(失败时为默认值)</summary>
        public readonly T Data;

        /// <summary>请求追踪 ID(与服务端日志/响应头 x-request-id 一致,排障凭据)</summary>
        public readonly string RequestId;

        public ApiResult(bool ok, int code, string message, T data, string requestId)
        {
            Ok = ok;
            Code = code;
            Message = message;
            Data = data;
            RequestId = requestId;
        }

        public static ApiResult<T> Success(T data, string requestId)
        {
            return new ApiResult<T>(true, 0, "ok", data, requestId);
        }

        public static ApiResult<T> Failure(int code, string message, string requestId)
        {
            return new ApiResult<T>(false, code, message, default, requestId);
        }
    }
}
