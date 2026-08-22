// 职责:运行时圆角精灵工厂——按半径生成抗锯齿圆角矩形/圆形 Sprite 并缓存(替代美术九宫格,A-6 骨架)
// 关联任务:PKG-09(A-6);B1 视觉走查后可替换为美术切图,接口不变
using System.Collections.Generic;
using UnityEngine;

namespace VRM.UI
{
    public static class RoundedSpriteFactory
    {
        private static readonly Dictionary<(int size, int radius), Sprite> Cache = new Dictionary<(int, int), Sprite>();

        /// <summary>圆角矩形 Sprite(正方形边长 size、圆角 radius;radius≥size/2 时退化为圆形)</summary>
        public static Sprite Rounded(int size = 64, int radius = 12)
        {
            radius = Mathf.Clamp(radius, 0, size / 2);
            var key = (size, radius);
            if (Cache.TryGetValue(key, out var cached) && cached != null)
            {
                return cached;
            }

            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear
            };

            // 2x 超采样抗锯齿:按 4 邻域覆盖率混合边缘像素
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var coverage = CornerCoverage(x + 0.5f, y + 0.5f, size, radius);
                    texture.SetPixel(x, y, new Color(1f, 1f, 1f, coverage));
                }
            }

            texture.Apply();
            var sprite = Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>圆形 Sprite(胶囊/圆钮用)</summary>
        public static Sprite Circle(int size = 64)
        {
            return Rounded(size, size / 2);
        }

        /// <summary>点到圆角矩形的覆盖率(SDF 近似,4 邻域采样取均值抗锯齿)</summary>
        internal static float CornerCoverage(float px, float py, float size, float radius)
        {
            const int samples = 4;
            var offsets = new[] { (-0.25f, -0.25f), (0.25f, -0.25f), (-0.25f, 0.25f), (0.25f, 0.25f) };
            var inside = 0f;
            for (var i = 0; i < samples; i++)
            {
                if (InsideRoundedRect(px + offsets[i].Item1, py + offsets[i].Item2, size, radius))
                {
                    inside += 1f;
                }
            }
            return inside / samples;
        }

        private static bool InsideRoundedRect(float px, float py, float size, float radius)
        {
            var half = size / 2f;
            var dx = Mathf.Abs(px - half) - (half - radius);
            var dy = Mathf.Abs(py - half) - (half - radius);
            if (dx <= 0f || dy <= 0f)
            {
                return px >= 0f && px <= size && py >= 0f && py <= size;
            }
            return dx * dx + dy * dy <= radius * radius;
        }
    }
}
