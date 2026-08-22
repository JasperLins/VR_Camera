// 职责:贴纸 UI 构建助手——墨描边贴纸块/硬偏移阴影/标签文本的程序化构建(A-6 组件库的地基)
// 关联任务:PKG-09;所有组件视觉必须经本助手产出(统一描边/阴影/圆角,禁止散落手搭)
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI
{
    public static class StickerUi
    {
        /// <summary>贴纸块:圆角矩形 + 2px 墨描边(uGUI Outline 近似)+ 可选 4px 硬偏移阴影</summary>
        public static Image StickerBlock(Transform parent, Color fill, Vector2 size, float radius, bool hardShadow = false)
        {
            var go = new GameObject("StickerBlock", typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.sizeDelta = size;

            var image = go.GetComponent<Image>();
            // 统一 96px/24px 圆角九宫格精灵(Sliced 缩放,圆角视觉近似;B1 走查后可换美术切图)
            image.sprite = RoundedSpriteFactory.Rounded(96, 24);
            image.type = Image.Type.Sliced;
            image.color = fill;

            var outline = go.AddComponent<Outline>();
            outline.effectColor = StickerTheme.Ink;
            outline.effectDistance = new Vector2(StickerTheme.BorderPx, -StickerTheme.BorderPx);

            if (hardShadow)
            {
                var shadow = go.AddComponent<Shadow>();
                shadow.effectColor = StickerTheme.Ink;
                shadow.effectDistance = new Vector2(StickerTheme.ShadowOffsetPx, -StickerTheme.ShadowOffsetPx);
            }

            return image;
        }

        /// <summary>标签文本(默认加粗;字体用内置动态字体,CJK 由系统回退,B1 走查后换思源黑体)</summary>
        public static Text Label(Transform parent, string content, int fontSize, Color color, bool bold = true)
        {
            var go = new GameObject("Label", typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);

            var text = go.GetComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.text = content;
            text.fontSize = fontSize;
            text.fontStyle = bold ? FontStyle.Bold : FontStyle.Normal;
            text.color = color;
            text.alignment = TextAnchor.MiddleCenter;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        /// <summary>铺满父节点的装饰块(页面底色等)</summary>
        public static Image FullRect(Transform parent, Color color)
        {
            var go = new GameObject("FullRect", typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var image = go.GetComponent<Image>();
            image.color = color;
            image.raycastTarget = false;
            return image;
        }

        /// <summary>文本按钮:贴纸块 + 居中文案(按压反馈由调用方按需扩展)</summary>
        public static Button StickerButton(Transform parent, string label, Vector2 size, Color fill)
        {
            var block = StickerBlock(parent, fill, size, StickerTheme.RadiusControl, hardShadow: true);
            var rect = (RectTransform)block.transform;
            var button = block.gameObject.AddComponent<Button>();
            button.targetGraphic = block;
            StickerUi.Label(rect, label, StickerTheme.BodySize, StickerTheme.White);
            return button;
        }
    }
}
