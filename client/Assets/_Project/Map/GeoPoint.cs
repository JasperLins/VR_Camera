// 职责:地理坐标载体——WGS84 经纬度 + 椭球高;全客户端坐标传递的统一类型
// 关联需求:FR-03(放置落库);关联任务:PKG-07(B-2 前置)
// 红线(D-006):全链 WGS84;海拔口径统一 ARCore Geospatial 椭球高(禁与 GPS 海拔混用)
using System;

namespace VRM.Map
{
    [Serializable]
    public readonly struct GeoPoint : IEquatable<GeoPoint>
    {
        /// <summary>纬度(WGS84,度)</summary>
        public readonly double Latitude;

        /// <summary>经度(WGS84,度)</summary>
        public readonly double Longitude;

        public GeoPoint(double latitude, double longitude)
        {
            Latitude = latitude;
            Longitude = longitude;
        }

        public bool Equals(GeoPoint other)
        {
            return Latitude.Equals(other.Latitude) && Longitude.Equals(other.Longitude);
        }

        public override string ToString()
        {
            return $"({Latitude:F7}, {Longitude:F7})";
        }
    }
}
