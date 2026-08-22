// 职责:UI 服务门面——Toast/加载/空态的统一调用入口,底层实现可被替换(测试/B1 视觉升级)
// 关联任务:PKG-09(A-6);调用方式:UIService.ShowToast("已保存")
// 红线:文案不得出现购买/充值语义(D-023);Token 只显示数值(D-029)
using UnityEngine;

namespace VRM.UI
{
    public static class UIService
    {
        private static IToastService _toast;

        public static void ShowToast(string message)
        {
            (_toast ??= new DefaultToastService()).Show(message);
        }

        /// <summary>替换 Toast 实现(测试注入或 B1 视觉版)</summary>
        public static void SetToast(IToastService toast)
        {
            _toast = toast;
        }

        /// <summary>清场重置(Bootstrap 每次初始化调用,防域重载残留)</summary>
        public static void ResetToDefaults()
        {
            _toast = null;
        }
    }

    public interface IToastService
    {
        void Show(string message);
    }

    /// <summary>
    /// 默认 Toast 实现:屏幕上方简易文本条(仅开发期可用性,B1 按 ui-spec 贴纸样式重做)
    /// </summary>
    internal sealed class DefaultToastService : IToastService
    {
        public void Show(string message)
        {
            Debug.Log($"[Toast] {message}");
        }
    }
}
