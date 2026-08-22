// 职责:锚定服务——双模式选择器:优先 Geospatial(VPS 可用),不可用自动降级 GPS+罗盘(D-022)
// 关联需求:FR-02;关联任务:PKG-12(C-3 双模式自动切换)
// 降级事件驱动 S7「对齐失败/降级浮层」的展示时机(PKG-09 页面就绪后接线)
using System;
using System.Threading.Tasks;

namespace VRM.AR
{
    public sealed class AnchorService
    {
        /// <summary>选定模式后通知 UI(降级提示/验收埋点)</summary>
        public event Action<AnchorMode> ModeSelected;

        public IAnchorProvider ActiveProvider { get; private set; }

        /// <summary>双模式探测与选择;总是能返回至少一个 GPS+罗盘兜底</summary>
        public async Task<IAnchorProvider> SelectProviderAsync(
            GeospatialAnchorProvider geospatial,
            GpsCompassAnchorProvider gpsCompass)
        {
            var geospatialStatus = await geospatial.InitializeAsync();
            if (geospatialStatus == AR.AnchorProviderStatus.Ready)
            {
                ActiveProvider = geospatial;
            }
            else
            {
                // VPS 无覆盖/大陆不可达(R1)→ 降级基线
                await gpsCompass.InitializeAsync();
                ActiveProvider = gpsCompass;
            }

            ModeSelected?.Invoke(ActiveProvider.Mode);
            return ActiveProvider;
        }
    }
}
