// 职责:锚定模式枚——MVP 基线为 GPS+罗盘降级锚定(D-022),Geospatial 为预留双模式
// 关联需求:FR-02;关联任务:PKG-04(PR-1 预研)/ PKG-12(C-2/C-3)
namespace VRM.AR
{
    public enum AnchorMode
    {
        /// <summary>GPS + 磁力计罗盘的世界对齐(MVP 基线,目标偏差 ≤10m)</summary>
        GpsCompass,

        /// <summary>ARCore Geospatial(VPS 覆盖可用时自动升级,大陆预期不可用 R1)</summary>
        Geospatial
    }
}
