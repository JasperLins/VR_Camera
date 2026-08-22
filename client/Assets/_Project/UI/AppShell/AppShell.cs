// 职责:App 壳——根 Canvas + 页面容器 + TabBar 的运行时装配;每个场景加载后自动就位(A-2)
// 关联任务:PKG-09;页面注册表新增页面时在此挂接(或由各模块 Bootstrap 注册)
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using VRM.UI.Pages;

namespace VRM.UI
{
    public sealed class AppShell : MonoBehaviour
    {
        public static AppShell Instance { get; private set; }

        private TabBarView _tabBar;

        /// <summary>场景加载后自动建壳(RuntimeInitializeOnLoadMethod 对每个 Play 会话生效一次)</summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureShell()
        {
            if (Instance != null)
            {
                return;
            }

            var go = new GameObject(nameof(AppShell));
            DontDestroyOnLoad(go);
            Instance = go.AddComponent<AppShell>();
            Instance.Build();
        }

        private void Build()
        {
            BuildRootCanvas();

            var pagesRoot = new GameObject("Pages", typeof(RectTransform));
            pagesRoot.transform.SetParent(transform.parent, false);
            var pagesRect = (RectTransform)pagesRoot.transform;
            Stretch(pagesRect, bottom: 96f); // 让出 TabBar 高度

            RegisterPage(MapHomePage.Build(pagesRect.transform));
            RegisterPage(StoreHomePage.Build(pagesRect.transform));
            RegisterPage(ProfileHomePage.Build(pagesRect.transform));
            RegisterPage(ArCameraEntryPage.Build(transform.parent));

            _tabBar = TabBarView.Build(
                transform.parent,
                pageId => PageRouter.TryNavigateTo(pageId),
                () => PageRouter.TryNavigateTo(nameof(ArCameraEntryPage)));
            UIShell.RegisterTabBar(_tabBar.gameObject);

            LoadingOverlay.Build(transform.parent);

            PageRouter.Navigated += OnNavigated;
            PageRouter.TryNavigateTo(TabBarSpec.DefaultPageId);

            // 视觉版 Toast 接管开发期日志版(A-6)
            UIService.SetToast(new StickerToastService());
        }

        private void BuildRootCanvas()
        {
            var canvasGo = new GameObject("RootCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 0;

            // 参考分辨率 1080×2340(原型设备壳基准),matchHeight 保宽度自适应
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 2340f);
            scaler.matchWidthOrHeight = 1f;

            if (Object.FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                DontDestroyOnLoad(es);
            }

            UIShell.CanvasTransform = canvas.transform;
            transform.SetParent(canvas.transform, false);
        }

        private static void RegisterPage(Page page)
        {
            PageRouter.Register(page);
        }

        private void OnNavigated(Page page)
        {
            // A-701:豁免屏(S1/S2、AR 全屏 S5-S20、S32)不显示 TabBar
            UIShell.SetTabBarVisible(page.ShowsTabBar);
            _tabBar.SetActive(page.PageId);
        }

        private static void Stretch(RectTransform rect, float bottom = 0f)
        {
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.offsetMin = new Vector2(0f, bottom);
            rect.offsetMax = Vector2.zero;
        }
    }
}
