// 职责:UI 壳静态入口——根 Canvas 引用与 TabBar 显隐控制(A-701 豁免由 Page.ShowsTabBar 驱动)
// 关联任务:PKG-09(A-2 App 壳)
using UnityEngine;

namespace VRM.UI
{
    public static class UIShell
    {
        /// <summary>根 Canvas 变换(AppShell 构建后有值;为空时组件可延迟到壳就绪)</summary>
        public static Transform CanvasTransform { get; internal set; }

        /// <summary>TabBar 当前是否可见(AR 全屏会话等豁免屏为 false)</summary>
        public static bool TabBarVisible => _tabBarRoot != null && _tabBarRoot.activeSelf;

        private static GameObject _tabBarRoot;

        internal static void RegisterTabBar(GameObject tabBarRoot)
        {
            _tabBarRoot = tabBarRoot;
        }

        internal static void SetTabBarVisible(bool visible)
        {
            if (_tabBarRoot != null)
            {
                _tabBarRoot.SetActive(visible);
            }
        }
    }
}
