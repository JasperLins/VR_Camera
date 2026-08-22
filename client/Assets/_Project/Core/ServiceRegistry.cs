// 职责:轻量服务注册表——模块解耦的唯一粘合点;替代散落单例,支持测试替换与整体清场
// 关联任务:PKG-01(A-1 分层架构)
// 用法:ServiceRegistry.Register<IApiClient>(instance) / ServiceRegistry.Resolve<IApiClient>()
using System;
using System.Collections.Generic;

namespace VRM.Core
{
    public static class ServiceRegistry
    {
        private static readonly Dictionary<Type, object> Services = new Dictionary<Type, object>();

        public static void Register<T>(T service) where T : class
        {
            Services[typeof(T)] = service ?? throw new ArgumentNullException(nameof(service));
        }

        public static bool TryResolve<T>(out T service) where T : class
        {
            if (Services.TryGetValue(typeof(T), out var found) && found is T typed)
            {
                service = typed;
                return true;
            }

            service = null;
            return false;
        }

        public static T Resolve<T>() where T : class
        {
            if (TryResolve(out T service))
            {
                return service;
            }

            throw new InvalidOperationException(
                $"服务未注册: {typeof(T).Name}(请在 Bootstrap 初始化阶段 Register)");
        }

        /// <summary>测试/场景切换清场用;运行期业务代码禁止调用</summary>
        public static void Clear()
        {
            Services.Clear();
        }
    }
}
