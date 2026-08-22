// 职责:AR 相机入口占位(S5)——深色舞台底(A-711),全屏会话不带 TabBar(A-701);
//       真实 AR Foundation 会话(B2/PKG-12)接入后本页替换为取景框
// 关联需求:FR-02;关联任务:PKG-09(A-2 壳)→ PKG-12(C-1~C-8)
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI.Pages
{
    public sealed class ArCameraEntryPage : Page
    {
        /// <summary>AR 全屏会话豁免 TabBar(A-701)</summary>
        public override bool ShowsTabBar => false;

        public static ArCameraEntryPage Build(Transform parent)
        {
            var go = new GameObject(nameof(ArCameraEntryPage), typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            // 深色舞台:#140E0A(A-711 rgba(20,14,10) 实底化)
            StickerUi.FullRect(rect, new Color32(0x14, 0x0E, 0x0A, 0xFF));

            var badge = StickerUi.StickerBlock(
                rect,
                new Color(0.10f, 0.055f, 0.04f, 0.8f),
                new Vector2(640f, 200f),
                StickerTheme.RadiusCard);
            var badgeRect = (RectTransform)badge.transform;
            badgeRect.anchorMin = new Vector2(0.5f, 0.5f);
            badgeRect.anchorMax = new Vector2(0.5f, 0.5f);
            badgeRect.anchoredPosition = Vector2.zero;

            var title = StickerUi.Label(badgeRect, "📷 AR 相机", StickerTheme.TitleSize, StickerTheme.White);
            title.rectTransform.anchoredPosition = new Vector2(0f, 44f);
            var hint = StickerUi.Label(
                badgeRect,
                "取景框与锚定在此接入\n(PKG-12:对齐 ≤15s / 漂移 ≤1m / 滑动切换)",
                StickerTheme.BodySize,
                new Color(0.85f, 0.78f, 0.72f),
                bold: false);
            hint.rectTransform.anchoredPosition = new Vector2(0f, -32f);
            hint.rectTransform.sizeDelta = new Vector2(580f, 90f);

            var back = StickerUi.StickerButton(rect, "返回", new Vector2(200f, 56f), StickerTheme.Coral);
            var backRect = (RectTransform)back.transform;
            backRect.anchorMin = new Vector2(0.5f, 0f);
            backRect.anchorMax = new Vector2(0.5f, 0f);
            backRect.anchoredPosition = new Vector2(0f, 80f);
            back.onClick.AddListener(PageRouter.Back);

            return go.AddComponent<ArCameraEntryPage>();
        }
    }
}
