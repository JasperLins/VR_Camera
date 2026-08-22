// 职责:设备分级检测——内存/CPU/着色器能力 → 高/中/低三档,写入 AppConfig(FR-02/FR-11 渲染降级依据)
// 关联任务:PKG-09(A-4);分级阈值经验口径,真机矩阵标定后回填(dev-log 登记)
using UnityEngine;

namespace VRM.Core
{
    public static class DeviceTierDetector
    {
        /// <summary>纯函数分级(可单测):内存 MB 与 CPU 核数 → 档位
        /// 低:<4GB 或 ≤4 核;中:4-8GB;高:≥8GB 且 ≥8 核</summary>
        public static DeviceTier Classify(int systemMemoryMb, int processorCount)
        {
            if (systemMemoryMb < 4096 || processorCount <= 4)
            {
                return DeviceTier.Low;
            }
            if (systemMemoryMb < 8192)
            {
                return DeviceTier.Medium;
            }
            return processorCount >= 8 ? DeviceTier.High : DeviceTier.Medium;
        }

        /// <summary>读取本机参数并应用到 AppConfig(Bootstrap 调用一次)</summary>
        public static DeviceTier ApplyFromDevice()
        {
            var tier = Classify(SystemInfo.systemMemorySize, SystemInfo.processorCount);
            AppConfig.SetDeviceTier(tier);
            Debug.Log($"[DeviceTier] memory={SystemInfo.systemMemorySize}MB cpu={SystemInfo.processorCount} → {tier}");
            return tier;
        }
    }
}
