// 职责:加载态遮罩——半透明墨色遮罩 + 居中胶囊「加载中…」(A-6;网络请求/地图加载共用)
// 关联任务:PKG-09;用法:LoadingOverlay.Instance.Show()/Hide()
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI
{
    public sealed class LoadingOverlay : UIWidget
    {
        private static LoadingOverlay _instance;

        public static LoadingOverlay Instance =>
            _instance != null ? _instance : _instance = Build(UIShell.CanvasTransform);

        internal static LoadingOverlay Build(Transform parent)
        {
            var go = new GameObject("LoadingOverlay", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var overlay = go.AddComponent<LoadingOverlay>();
            overlay.Hide();
            return overlay;
        }

        public override void Show()
        {
            Rebuild();
            base.Show();
        }

        private void Rebuild()
        {
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                Destroy(transform.GetChild(i).gameObject);
            }

            var dim = StickerUi.FullRect(transform, new Color(0.10f, 0.055f, 0.04f, 0.45f));
            dim.raycastTarget = true; // 阻断误触

            var pill = StickerUi.StickerBlock(
                transform,
                StickerTheme.White,
                new Vector2(180f, 52f),
                StickerTheme.RadiusPill,
                hardShadow: true);
            var rect = (RectTransform)pill.transform;
            rect.anchoredPosition = Vector2.zero;
            StickerUi.Label(rect, "加载中…", StickerTheme.BodySize, StickerTheme.Ink);
        }
    }
}
