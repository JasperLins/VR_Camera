// 职责:个人主页占位(S30,P1)——登录态入口/钱包/足迹/内容管理/设置;真实页面 B3~B4 逐步替换
// 关联需求:FR-06/07/13;关联任务:PKG-09(A-2 壳)→ PKG-20/21(B3)PKG-23(B4)
using UnityEngine;

namespace VRM.UI.Pages
{
    public sealed class ProfileHomePage : Page
    {
        public static ProfileHomePage Build(Transform parent)
        {
            var go = new GameObject(nameof(ProfileHomePage), typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            StickerUi.FullRect(rect, StickerTheme.Paper);

            var title = StickerUi.Label(rect, "我的", StickerTheme.DisplaySize, StickerTheme.Ink);
            title.rectTransform.anchorMin = new Vector2(0f, 1f);
            title.rectTransform.anchorMax = new Vector2(1f, 1f);
            title.rectTransform.pivot = new Vector2(0.5f, 1f);
            title.rectTransform.anchoredPosition = new Vector2(0f, -64f);

            EmptyState.Build(
                rect,
                "👤",
                "游客浏览中",
                "微信登录开通后展示完整主页\n(钱包 S22 / 内容管理 S21 / 足迹 S31 将陆续接入)");
            return go.AddComponent<ProfileHomePage>();
        }
    }
}
