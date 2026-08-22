// 职责:顶点渐变 Graphic——相机凸起钮等「霓虹强调」三处的 135° 渐变(uGUI Image 不支持渐变);
//       isCircle=true 时生成扇形圆网格(圆钮免精灵)
// 关联任务:PKG-09(A-6);渐变滥用防线:仅 StickerTheme 声明的三处使用(D-059)
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI
{
    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class GradientImage : Graphic
    {
        [Tooltip("渐变起点色(左上)")]
        public Color from = StickerTheme.Coral;

        [Tooltip("渐变终点色(右下)")]
        public Color to = StickerTheme.Sunset;

        [Tooltip("圆形网格(凸起圆钮用)")]
        public bool isCircle;

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            if (isCircle)
            {
                PopulateCircle(vh);
            }
            else
            {
                PopulateRect(vh);
            }
        }

        private void PopulateRect(VertexHelper vh)
        {
            var rect = GetPixelAdjustedRect();
            var v = new UIVertex[4];
            v[0].position = new Vector3(rect.x, rect.y + rect.height, 0f);
            v[0].color = Color.Lerp(from, to, 0.25f);
            v[1].position = new Vector3(rect.x + rect.width, rect.y + rect.height, 0f);
            v[1].color = Color.Lerp(from, to, 0.55f);
            v[2].position = new Vector3(rect.x + rect.width, rect.y, 0f);
            v[2].color = Color.Lerp(from, to, 0.85f);
            v[3].position = new Vector3(rect.x, rect.y, 0f);
            v[3].color = to;
            for (var i = 0; i < 4; i++)
            {
                v[i].uv0 = Vector2.zero;
                vh.AddVert(v[i]);
            }
            vh.AddTriangle(0, 1, 2);
            vh.AddTriangle(2, 3, 0);
        }

        private void PopulateCircle(VertexHelper vh)
        {
            var rect = GetPixelAdjustedRect();
            var center = rect.center;
            var radius = Mathf.Min(rect.width, rect.height) * 0.5f;
            var centerVert = UIVertex.simpleVert;
            centerVert.position = center;
            centerVert.color = Color.Lerp(from, to, 0.4f);
            vh.AddVert(centerVert);

            const int segments = 36;
            for (var i = 0; i <= segments; i++)
            {
                var angle = i / (float)segments * Mathf.PI * 2f;
                var dir = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle));
                var vert = UIVertex.simpleVert;
                vert.position = center + dir * radius;
                // 右下方向偏 to,左上方向偏 from(与矩形渐变方向一致)
                var t = (dir.x * 0.5f + (0.5f - dir.y * 0.5f)) * 0.5f + 0.5f;
                vert.color = Color.Lerp(from, to, Mathf.Clamp01(t));
                vh.AddVert(vert);
                if (i > 0)
                {
                    vh.AddTriangle(0, i, i + 1);
                }
            }
        }

        protected override void UpdateGeometry()
        {
            // 每帧重算顶点(颜色可在运行期被主题刷新);基类实现有缓存,这里直接重建
            if (canvasRenderer != null)
            {
                var vh = new VertexHelper();
                OnPopulateMesh(vh);
                vh.FillMesh(workerMesh);
                canvasRenderer.SetMesh(workerMesh);
            }
        }
    }
}
