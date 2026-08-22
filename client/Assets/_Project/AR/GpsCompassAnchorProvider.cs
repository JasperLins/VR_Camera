// 职责:GPS+罗盘降级锚定提供方(骨架)——Android LocationManager + 磁力计 → 世界对齐
// 关联需求:FR-02;关联任务:PKG-12(C-2)/ 预研 PR-1b(漂移抑制滤波选型,Sprint-0 真机项)
// ⚠ Sprint-0 状态:接口与数据流骨架;传感器读取与滤波在 PR-1b 结论后实现(人工主导任务)
using System;
using System.Threading.Tasks;
using UnityEngine;
using VRM.Map;

namespace VRM.AR
{
    public sealed class GpsCompassAnchorProvider : IAnchorProvider
    {
        public AnchorMode Mode => AnchorMode.GpsCompass;

        private AnchorProviderStatus _status = AnchorProviderStatus.Failed;
        private DeviceGeoPose _lastPose;

        public Task<AnchorProviderStatus> InitializeAsync()
        {
            // TODO(PKG-12/C-2 + PR-1b):
            // 1) Android LocationManager(GPS_PROVIDER)请求 + 权限触发(D-031 单独同意);
            // 2) 磁力计+加速度计 → RotationVector 重投影为真北航向;
            // 3) 漂移抑制滤波(PR-1b 选型:卡尔曼/互补滤波);
            // 4) Input.location 属 Unity API,真机初始化后回写 _status。
            Debug.Log("[GpsCompassAnchor] skeleton ready — sensors wired in PKG-12 (after PR-1b)");
            _status = AnchorProviderStatus.Degraded;
            return Task.FromResult(_status);
        }

        public Task<DeviceGeoPose> GetPoseAsync()
        {
            if (_status == AnchorProviderStatus.Failed)
            {
                throw new InvalidOperationException("锚定提供方未初始化(先调用 InitializeAsync)");
            }

            // TODO(PKG-12/C-2):返回滤波后的实时位姿;当前返回上次采样占位
            return Task.FromResult(_lastPose);
        }

        /// <summary>传感器回调入口(PKG-12 接线后由平台层调用)</summary>
        internal void OnPoseSampled(DeviceGeoPose pose)
        {
            _lastPose = pose;
        }
    }
}
