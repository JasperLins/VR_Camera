// 职责:TabBar 视图——程序化构建 4 格 TabBar(白底/顶墨线/激活贴纸块/中央凸起渐变相机钮/底部指示条)
// 关联任务:PKG-09(A-2);视觉基准:work/UI/map-home.html nav.tabbar
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace VRM.UI
{
    public sealed class TabBarView : MonoBehaviour
    {
        private struct Slot
        {
            public RectTransform Root;
            public Image ActiveBlock;
            public Text Label;
        }

        private readonly Dictionary<string, Slot> _slots = new Dictionary<string, Slot>();

        public static TabBarView Build(Transform parent, System.Action<string> onTabSelected, System.Action onCameraPressed)
        {
            var go = new GameObject("TabBar", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var root = (RectTransform)go.transform;
            root.anchorMin = new Vector2(0f, 0f);
            root.anchorMax = new Vector2(1f, 0f);
            root.pivot = new Vector2(0.5f, 0f);
            root.sizeDelta = new Vector2(0f, 96f);

            var bg = StickerUi.FullRect(root, StickerTheme.White);
            bg.raycastTarget = false;
            AddTopBorder(root);

            var view = go.AddComponent<TabBarView>();
            view.BuildSlots(root, onTabSelected, onCameraPressed);
            view.BuildHomeIndicator(root);
            view.SetActive(TabBarSpec.DefaultPageId);
            return view;
        }

        /// <summary>高亮指定页的 Tab(AR 会话等非 Tab 页不高亮任何格)</summary>
        public void SetActive(string pageId)
        {
            foreach (var entry in _slots)
            {
                var selected = entry.Key == pageId;
                entry.Value.ActiveBlock.enabled = selected;
                entry.Value.Label.color = selected ? StickerTheme.Coral : StickerTheme.InkSecondary;
            }
        }

        private void BuildSlots(RectTransform root, System.Action<string> onTabSelected, System.Action onCameraPressed)
        {
            var grid = new GameObject("Slots", typeof(RectTransform), typeof(GridLayoutGroup));
            grid.transform.SetParent(root, false);
            var rect = (RectTransform)grid.transform;
            rect.anchorMin = new Vector2(0f, 0.35f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = new Vector2(-24f, 8f);

            var layout = grid.GetComponent<GridLayoutGroup>();
            layout.cellSize = new Vector2(96f, 56f);
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 4;
            layout.childAlignment = TextAnchor.MiddleCenter;

            for (var i = 0; i < TabBarSpec.Items.Count; i++)
            {
                var item = TabBarSpec.Items[i];
                if (i == TabBarSpec.CameraSlotIndex)
                {
                    BuildCameraSlot(grid.transform, onCameraPressed);
                    continue;
                }
                BuildPageSlot(grid.transform, item, onTabSelected);
            }
        }

        private void BuildPageSlot(Transform parent, TabSpec item, System.Action<string> onTabSelected)
        {
            var slotGo = new GameObject($"Tab_{item.Label}", typeof(RectTransform));
            slotGo.transform.SetParent(parent, false);

            // 激活态贴纸块(42×30,珊瑚底墨边,居中偏上)
            var block = StickerUi.StickerBlock(slotGo.transform, StickerTheme.Coral, new Vector2(42f, 30f), 12f);
            block.name = "ActiveBlock";
            var blockRect = (RectTransform)block.transform;
            blockRect.anchoredPosition = new Vector2(0f, 12f);
            StickerUi.Label(blockRect, item.IconGlyph, 14, StickerTheme.White);

            // 标签(底部)
            var label = StickerUi.Label(slotGo.transform, item.Label, 10, StickerTheme.InkSecondary);
            label.rectTransform.anchorMin = new Vector2(0f, 0f);
            label.rectTransform.anchorMax = new Vector2(1f, 0.22f);
            label.rectTransform.offsetMin = Vector2.zero;
            label.rectTransform.offsetMax = Vector2.zero;

            var button = slotGo.AddComponent<Button>();
            button.transition = Selectable.Transition.None;
            button.onClick.AddListener(() => onTabSelected(item.PageId));

            _slots[item.PageId] = new Slot
            {
                Root = (RectTransform)slotGo.transform,
                ActiveBlock = block,
                Label = label
            };
        }

        private void BuildCameraSlot(Transform parent, System.Action onCameraPressed)
        {
            // 网格单元(受 GridLayout 控制大小),内部再放凸出按钮,避免渐变钮被拉伸成椭圆
            var cell = new GameObject("Tab_Camera", typeof(RectTransform));
            cell.transform.SetParent(parent, false);

            // 中央凸起相机钮:56×56 渐变圆 + 墨边 + 硬阴影(渐变仅三处之一,A-711)
            var buttonGo = new GameObject("CameraButton", typeof(RectTransform));
            buttonGo.transform.SetParent(cell.transform, false);
            var buttonRect = (RectTransform)buttonGo.transform;
            buttonRect.sizeDelta = new Vector2(56f, 56f);
            buttonRect.anchoredPosition = new Vector2(0f, 26f); // 凸出 TabBar 上沿

            var gradient = buttonGo.AddComponent<GradientImage>();
            gradient.isCircle = true;
            var outline = buttonGo.AddComponent<Outline>();
            outline.effectColor = StickerTheme.Ink;
            outline.effectDistance = new Vector2(StickerTheme.BorderPx, -StickerTheme.BorderPx);
            var shadow = buttonGo.AddComponent<Shadow>();
            shadow.effectColor = StickerTheme.Ink;
            shadow.effectDistance = new Vector2(StickerTheme.ShadowOffsetPx, -StickerTheme.ShadowOffsetPx);

            StickerUi.Label(buttonRect, "📷", 19, StickerTheme.White);

            var button = buttonGo.AddComponent<Button>();
            button.targetGraphic = gradient;
            button.onClick.AddListener(() => onCameraPressed());

            // 「AR 相机」小标签在钮下方(单元内,不受网格二次布局)
            var caption = StickerUi.Label(cell.transform, "AR 相机", 10, StickerTheme.InkSecondary);
            caption.rectTransform.anchoredPosition = new Vector2(0f, -22f);
        }

        private void BuildHomeIndicator(RectTransform root)
        {
            var pill = StickerUi.StickerBlock(root, StickerTheme.Ink, new Vector2(124f, 5f), StickerTheme.RadiusPill);
            var rect = (RectTransform)pill.transform;
            rect.anchorMin = new Vector2(0.5f, 0f);
            rect.anchorMax = new Vector2(0.5f, 0f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = new Vector2(0f, 10f);
            pill.raycastTarget = false;
        }

        private static void AddTopBorder(RectTransform root)
        {
            var border = StickerUi.FullRect(root, StickerTheme.Ink);
            var rect = (RectTransform)border.transform;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.sizeDelta = new Vector2(0f, StickerTheme.BorderPx);
        }
    }
}
