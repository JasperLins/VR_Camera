// 职责:商店首页占位(S26,P1)——灰度期可隐藏(D-032/D-035);真实三区列表 B4/PKG-24 落地
// 关联需求:FR-09;关联任务:PKG-09(A-2 壳)→ PKG-24(J-1~J-4)
using UnityEngine;

namespace VRM.UI.Pages
{
    public sealed class StoreHomePage : Page
    {
        public static StoreHomePage Build(Transform parent)
        {
            var go = new GameObject(nameof(StoreHomePage), typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            StickerUi.FullRect(rect, StickerTheme.Paper);

            var title = StickerUi.Label(rect, "模型商店", StickerTheme.DisplaySize, StickerTheme.Ink);
            title.rectTransform.anchorMin = new Vector2(0f, 1f);
            title.rectTransform.anchorMax = new Vector2(1f, 1f);
            title.rectTransform.pivot = new Vector2(0.5f, 1f);
            title.rectTransform.anchoredPosition = new Vector2(0f, -64f);

            EmptyState.Build(
                rect,
                "🏪",
                "商店即将开门",
                "官方精选 / 社区投稿 / 我的创作\n(三区列表于 PKG-24 落地)");
            return go.AddComponent<StoreHomePage>();
        }
    }
}
