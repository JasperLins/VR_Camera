// 职责:锚定提供方抽象——双模式自动切换的核心接口;C-2(GPS+罗盘)与 C-3(Geospatial)各一个实现
// 关联需求:FR-02(对齐 ≤15s、30s 漂移 ≤1m,锚定模式无关);关联任务:PKG-12
// 服务端数据模型与本接口解耦(锚点只存 WGS84+海拔,不存模式专有句柄,tech-stack §7.2)
using System;
using System.Threading.Tasks;
using VRM.Map;

namespace VRM.AR
{
    public enum AnchorProviderStatus
    {
        /// <summary>初始化完成,可用</summary>
        Ready,

        /// <summary>可用但精度降级(如罗盘校准差);UI 出 S7 降级浮层提示</summary>
        Degraded,

        /// <summary>不可用(无传感器/VPS 无覆盖);触发 AR 浏览阻断引导</summary>
        Failed
    }

    /// <summary>设备实时地理位姿(全 WGS84;海拔为 ARCore 椭球高口径)</summary>
    public readonly struct DeviceGeoPose
    {
        public readonly GeoPoint Position;
        public readonly double Altitude;
        /// <summary>罗盘航向(度,真北为 0 顺时针)</summary>
        public readonly double HeadingDegrees;
        public readonly DateTime SampledAtUtc;

        public DeviceGeoPose(GeoPoint position, double altitude, double headingDegrees, DateTime sampledAtUtc)
        {
            Position = position;
            Altitude = altitude;
            HeadingDegrees = headingDegrees;
            SampledAtUtc = sampledAtUtc;
        }
    }

    public interface IAnchorProvider
    {
        AnchorMode Mode { get; }

        /// <summary>异步初始化(传感器/VPS 探测);结论决定 AnchorService 的模式选择</summary>
        Task<AnchorProviderStatus> InitializeAsync();

        /// <summary>当前设备地理位姿(AR 放置/附近查询上送共用)</summary>
        Task<DeviceGeoPose> GetPoseAsync();
    }
}
