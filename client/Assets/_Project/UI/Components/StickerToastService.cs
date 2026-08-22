// 职责:贴纸 Toast 视觉实现——屏幕上方墨描边贴纸卡 + 自动淡出(A-6;替代开发期日志版)
// 关联任务:PKG-09;文案红线:不出现购买/充值语义(D-023)、Token 只显示数值(D-029)
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using VRM.Core;

namespace VRM.UI
{
    public sealed class StickerToastService : IToastService
    {
        private const float ShowSeconds = 2.2f;
        private const float FadeSeconds = 0.3f;

        public void Show(string message)
        {
            var runner = GlobalCoroutineRunner.Instance;
            runner.StartCoroutine(ShowRoutine(message));
        }

        private static IEnumerator ShowRoutine(string message)
        {
            var canvas = EnsureOverlayCanvas();
            var card = StickerUi.StickerBlock(
                canvas.transform,
                StickerTheme.White,
                new Vector2(320f, 48f),
                StickerTheme.RadiusControl,
                hardShadow: true);
            var rect = (RectTransform)card.transform;
            rect.anchoredPosition = new Vector2(0f, -180f);
            StickerUi.Label(rect, message, StickerTheme.BodySize, StickerTheme.Ink);

            yield return new WaitForSeconds(ShowSeconds);

            var group = card.gameObject.AddComponent<CanvasGroup>();
            var elapsed = 0f;
            while (elapsed < FadeSeconds)
            {
                elapsed += Time.deltaTime;
                group.alpha = 1f - elapsed / FadeSeconds;
                yield return null;
            }
            Object.Destroy(card.gameObject);
        }

        private static Canvas EnsureOverlayCanvas()
        {
            var existing = Object.FindFirstObjectByType<Canvas>();
            if (existing != null)
            {
                return existing;
            }
            var go = new GameObject("ToastCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            return canvas;
        }
    }
}
