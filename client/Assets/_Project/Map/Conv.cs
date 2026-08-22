// 职责:CONV 坐标转换适配器——WGS84↔GCJ-02 正逆变换,全客户端唯一转换点(D-006)
// 关联需求:FR-01(地图显示);关联任务:PKG-07(B-2)
// 红线:服务端与 AR 锚定全链 WGS84;仅地图显示层渲染前调用本类转 GCJ-02;
//       其他任何位置出现坐标转换算法即为违例(CONVENTIONS.md §5)
// 算法:公开 GCJ-02 约算法(eviltransform 系);逆变换 5 次迭代逼近,残余误差 <1e-6°(<0.2m),
//       已用北京/杭州/上海样本与公开基准点交叉验算(见 Assets/_Project/Tests/ConvTests.cs)
using System;

namespace VRM.Map
{
    public static class Conv
    {
        private const double SemiMajor = 6378245.0;                      // 克拉索夫斯基椭球长半轴
        private const double EccentricitySq = 6.69342162296594323e-3;    // 第一偏心率平方

        /// <summary>WGS84 → GCJ-02(地图显示用);境外点原样直通</summary>
        public static GeoPoint Wgs84ToGcj02(GeoPoint wgs)
        {
            if (OutOfChina(wgs))
            {
                return wgs;
            }

            var dLat = TransformLat(wgs.Longitude - 105.0, wgs.Latitude - 35.0);
            var dLng = TransformLng(wgs.Longitude - 105.0, wgs.Latitude - 35.0);

            var radLat = wgs.Latitude / 180.0 * Math.PI;
            var magic = 1 - EccentricitySq * Math.Sin(radLat) * Math.Sin(radLat);
            var sqrtMagic = Math.Sqrt(magic);

            dLat = dLat * 180.0 / ((SemiMajor * (1 - EccentricitySq)) / (magic * sqrtMagic) * Math.PI);
            dLng = dLng * 180.0 / (SemiMajor / sqrtMagic * Math.Cos(radLat) * Math.PI);

            return new GeoPoint(wgs.Latitude + dLat, wgs.Longitude + dLng);
        }

        /// <summary>GCJ-02 → WGS84(近似逆变换,迭代逼近);境外点原样直通</summary>
        public static GeoPoint Gcj02ToWgs84(GeoPoint gcj)
        {
            if (OutOfChina(gcj))
            {
                return gcj;
            }

            var lat = gcj.Latitude;
            var lng = gcj.Longitude;
            for (var i = 0; i < 5; i++)
            {
                var guess = Wgs84ToGcj02(new GeoPoint(lat, lng));
                lng += gcj.Longitude - guess.Longitude;
                lat += gcj.Latitude - guess.Latitude;
            }

            return new GeoPoint(lat, lng);
        }

        /// <summary>中国境内粗判(公开算法边界;境外不做偏移)</summary>
        public static bool OutOfChina(GeoPoint p)
        {
            return p.Longitude < 72.004 || p.Longitude > 137.8347
                                     || p.Latitude < 0.8293 || p.Latitude > 55.8271;
        }

        /// <summary>两点球面距离(Haversine,米)——验收与显示"距离 xx m"共用</summary>
        public static double DistanceMeters(GeoPoint a, GeoPoint b)
        {
            const double earthRadius = 6378137.0;
            var dLat = (b.Latitude - a.Latitude) / 180.0 * Math.PI;
            var dLng = (b.Longitude - a.Longitude) / 180.0 * Math.PI;
            var sinLat = Math.Sin(dLat / 2);
            var sinLng = Math.Sin(dLng / 2);
            var h = sinLat * sinLat
                    + Math.Cos(a.Latitude / 180.0 * Math.PI) * Math.Cos(b.Latitude / 180.0 * Math.PI) * sinLng * sinLng;
            return 2 * earthRadius * Math.Asin(Math.Min(1.0, Math.Sqrt(h)));
        }

        // ---- 私有:公开约算法的三角多项式(与 eviltransform 系实现一致) ----

        private static double TransformLat(double x, double y)
        {
            var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.Sqrt(Math.Abs(x));
            ret += (20.0 * Math.Sin(6.0 * x * Math.PI) + 20.0 * Math.Sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.Sin(y * Math.PI) + 40.0 * Math.Sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
            ret += (160.0 * Math.Sin(y / 12.0 * Math.PI) + 320.0 * Math.Sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
            return ret;
        }

        private static double TransformLng(double x, double y)
        {
            var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.Sqrt(Math.Abs(x));
            ret += (20.0 * Math.Sin(6.0 * x * Math.PI) + 20.0 * Math.Sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.Sin(x * Math.PI) + 40.0 * Math.Sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
            ret += (150.0 * Math.Sin(x / 12.0 * Math.PI) + 300.0 * Math.Sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
            return ret;
        }
    }
}
