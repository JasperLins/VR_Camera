// 职责:CONV 坐标转换 EditMode 单测——PKG-07(B-2)验收依据:正变换基准比对 + 逆变换回环
// 关联需求:FR-01;基准值来自公开 coordtransform 实现的北京样例点(2026-08-22 Node 脚本交叉验算)
using NUnit.Framework;
using VRM.Map;

public class ConvTests
{
    private const double ExactTolerance = 1e-9;  // 基准比对(算法逐位一致)
    private const double RoundTripTolerance = 1e-6; // 回环残余(<0.2m)

    [Test]
    public void Wgs84ToGcj02_BeijingReference_MatchesPublicBaseline()
    {
        // 公开基准:WGS84(116.404, 39.915) → GCJ02(116.410244499169, 39.916404281502)
        var wgs = new GeoPoint(39.915, 116.404);
        var gcj = Conv.Wgs84ToGcj02(wgs);

        Assert.AreEqual(116.410244499169, gcj.Longitude, ExactTolerance, "经度与公开基准不一致");
        Assert.AreEqual(39.916404281502, gcj.Latitude, ExactTolerance, "纬度与公开基准不一致");
    }

    [Test]
    public void Gcj02ToWgs84_RoundTrip_Beijing_RecoversOriginal()
    {
        var wgs = new GeoPoint(39.915, 116.404);
        var back = Conv.Gcj02ToWgs84(Conv.Wgs84ToGcj02(wgs));

        Assert.AreEqual(wgs.Latitude, back.Latitude, RoundTripTolerance);
        Assert.AreEqual(wgs.Longitude, back.Longitude, RoundTripTolerance);
    }

    [Test]
    public void Gcj02ToWgs84_RoundTrip_HangzhouFirstCity_RecoversOriginal()
    {
        // 首发城市样例(A-734 杭州湖滨—断桥一带)
        var wgs = new GeoPoint(30.2519, 120.1667);
        var back = Conv.Gcj02ToWgs84(Conv.Wgs84ToGcj02(wgs));

        Assert.AreEqual(wgs.Latitude, back.Latitude, RoundTripTolerance);
        Assert.AreEqual(wgs.Longitude, back.Longitude, RoundTripTolerance);
    }

    [Test]
    public void Wgs84ToGcj02_OutOfChina_PassthroughUnchanged()
    {
        // 境外直通:伦敦
        var overseas = new GeoPoint(51.5072, -0.1276);
        var converted = Conv.Wgs84ToGcj02(overseas);

        Assert.AreEqual(overseas, converted, "境外点必须原样直通(公开算法边界)");
    }

    [Test]
    public void Wgs84ToGcj02_Beijing_OffsetWithinKnownRange()
    {
        // GCJ 偏移量合理区间:100m–1500m(北京样例实测约 555m)
        var wgs = new GeoPoint(39.915, 116.404);
        var gcj = Conv.Wgs84ToGcj02(wgs);
        var offsetMeters = Conv.DistanceMeters(wgs, gcj);

        Assert.That(offsetMeters, Is.InRange(100.0, 1500.0), $"偏移量异常: {offsetMeters:F1}m");
    }

    [Test]
    public void DistanceMeters_KnownPair_MatchesHaversine()
    {
        // 纬度 1° ≈ 111.19km(Haversine 球面近似)
        var a = new GeoPoint(30.0, 120.0);
        var b = new GeoPoint(31.0, 120.0);
        var distance = Conv.DistanceMeters(a, b);

        Assert.AreEqual(111_195.0, distance, 500.0, "纬度 1 度距离与球面公式不符");
    }
}
