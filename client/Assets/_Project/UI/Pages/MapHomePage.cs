// 职责:地图发现首页占位(S3)——暖白纸底 + 标题 + 空区引导空态;真实地图(高德 SDK)B3/PKG-11 替换
// 关联需求:FR-01;关联任务:PKG-09(A-2 壳)→ PKG-11(B-1~B-8)
using UnityEngine;

namespace VRM.UI.Pages
{
    public sealed class MapHomePage : Page
    {
        public static MapHomePage Build(Transform parent)
        {
            var go = new GameObject(nameof(MapHomePage), typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            StickerUi.FullRect(rect, StickerTheme.Paper);

            var page = go.AddComponent<MapHomePage>();
            page.BuildContent(rect);
            return page;
        }

        private void BuildContent(RectTransform rect)
        {
            var title = StickerUi.Label(rect, "地图发现", StickerTheme.DisplaySize, StickerTheme.Ink);
            title.rectTransform.anchorMin = new Vector2(0f, 1f);
            title.rectTransform.anchorMax = new Vector2(1f, 1f);
            title.rectTransform.pivot = new Vector2(0.5f, 1f);
            title.rectTransform.anchoredPosition = new Vector2(0f, -64f);

            EmptyState.Build(
                rect,
                "🗺",
                "这一片还是空白地图…",
                "别灰心,惊喜都在下一个路口\n(高德地图接入于 PKG-11 落地)",
                "去热门区域逛逛",
                () => UIService.ShowToast("热门区域:PKG-11/B-8 落地"));
        }
    }
}
