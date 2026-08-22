// 职责:ARCore Geospatial 锚定提供方(骨架)——CheckVpsAvailability 探测 + 地理锚点创建封装
// 关联需求:FR-02;关联任务:PKG-12(C-3)/ 预研 PR-1a(大陆可用性实测,Sprint-0 真机项)
// ⚠ Sprint-0 状态:仅保留模式探测结论占位;AR Foundation API 调用在 PR-1a 结论后接入,
//    届时在本 asmdef 补充对 Unity.XR.ARFoundation 的实现引用(依赖已在 Packages/manifest 声明)
using System;
using System.Threading.Tasks;
using UnityEngine;
using VRM.Map;

namespace VRM.AR
{
    public sealed class GeospatialAnchorProvider : IAnchorProvider
    {
        public AnchorMode Mode => AnchorMode.Geospatial;

        private AnchorProviderStatus _status = AnchorProviderStatus.Failed;

        public Task<AnchorProviderStatus> InitializeAsync()
        {
            // TODO(PKG-12/C-3 + PR-1a):
            // 1) ARSession.state 检查 + ARCore 依赖安装检查;
            // 2) AREarthManager.FetchGeospatialLaunchConfiguration / CheckVpsAvailabilityAsync;
            // 3) 大陆预期 VPS 不可用(R1 高置信)→ 返回 Failed,由 AnchorService 切 GPS+罗盘;
            // 4) 可用路径:AddGeospatialAnchor 双模式通用(服务端模型无模式字段)。
            Debug.Log("[GeospatialAnchor] skeleton ready — AR Foundation wired in PKG-12 (after PR-1a)");
            _status = AnchorProviderStatus.Failed;
            return Task.FromResult(_status);
        }

        public Task<DeviceGeoPose> GetPoseAsync()
        {
            if (_status == AnchorProviderStatus.Failed)
            {
                throw new InvalidOperationException("Geospatial 不可用(应已切换 GPS+罗盘模式)");
            }

            // TODO(PKG-12/C-3):AREarthManager.CameraGeospatialPose → DeviceGeoPose(WGS84 椭球高)
            throw new NotImplementedException("PKG-12(C-3)落地");
        }
    }
}
