// 职责:空态组件——大 emoji 贴纸 + 标题 + 引导文案 + 可选动作按钮(E1-E26 边界的统一样式)
// 关联任务:PKG-09(A-6);各屏空态复用本组件,禁止各页手搭
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI
{
    public sealed class EmptyState : MonoBehaviour
    {
        public static EmptyState Build(
            Transform parent,
            string emoji,
            string title,
            string hint,
            string actionLabel = null,
            System.Action onAction = null)
        {
            var go = new GameObject("EmptyState", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = new Vector2(560f, 320f);

            var card = StickerUi.StickerBlock(rect, StickerTheme.White, new Vector2(560f, 320f), StickerTheme.RadiusCard, hardShadow: true);
            card.raycastTarget = false;

            var icon = StickerUi.Label(card.rectTransform, emoji, 64, StickerTheme.Ink);
            icon.rectTransform.anchoredPosition = new Vector2(0f, 92f);

            var titleLabel = StickerUi.Label(card.rectTransform, title, StickerTheme.TitleSize, StickerTheme.Ink);
            titleLabel.rectTransform.anchoredPosition = new Vector2(0f, 28f);
            titleLabel.rectTransform.sizeDelta = new Vector2(480f, 40f);

            var hintLabel = StickerUi.Label(card.rectTransform, hint, StickerTheme.BodySize, StickerTheme.InkSecondary, bold: false);
            hintLabel.rectTransform.anchoredPosition = new Vector2(0f, -28f);
            hintLabel.rectTransform.sizeDelta = new Vector2(460f, 80f);

            if (actionLabel != null)
            {
                var button = StickerUi.StickerButton(card.rectTransform, actionLabel, new Vector2(280f, 56f), StickerTheme.Coral);
                ((RectTransform)button.transform).anchoredPosition = new Vector2(0f, -116f);
                if (onAction != null)
                {
                    button.onClick.AddListener(() => onAction());
                }
            }

            return go.AddComponent<EmptyState>();
        }
    }
}
