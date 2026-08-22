// 职责:运行环境枚——dev/test/prod 三档,驱动 AppConfig 与日志级别
// 关联任务:PKG-01(A-1 工程基础)
namespace VRM.Core
{
    public enum AppEnvironmentKind
    {
        Development,
        Test,
        Production
    }
}
