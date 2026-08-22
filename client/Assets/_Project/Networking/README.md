# Networking — 网络层

装什么:IApiClient 抽象 + UnityWebRequest 实现(信封解析/鉴权注入/指数退避重试)。
边界:组件不得裸用 UnityWebRequest,一律经 ServiceRegistry.Resolve<IApiClient>();
契约 = 服务端 @vrm/shared 的 ApiResponse{code,message,data,requestId},改契约需双侧同步。
扩展:新接口调用写在各业务模块的 Service 类中,本层只保持通用传输能力。
