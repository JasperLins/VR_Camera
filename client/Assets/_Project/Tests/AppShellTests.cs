// 职责:AppShell 结构单测——运行时建壳全链路在 EditMode 下的首次执行验证(PKG-09 走查前置)
// 关联任务:PKG-09(A-2);此前单测未覆盖 UI 构建路径,靠本测试在 CI 拦截构建期异常
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using VRM.UI;
using VRM.UI.Pages;

public class AppShellTests
{
    private GameObject _shell;

    [SetUp]
    public void SetUp()
    {
        PageRouter.Reset();
    }

    [TearDown]
    public void TearDown()
    {
        if (_shell != null)
        {
            Object.DestroyImmediate(_shell);
        }
        // 清空壳静态引用,避免污染其他测试
        PageRouter.Reset();
        typeof(UIShell)
            .GetField("CanvasTransform", BindingFlags.Static | BindingFlags.NonPublic | BindingFlags.Public)
            ?.SetValue(null, null);
        typeof(UIShell)
            .GetField("_tabBarRoot", BindingFlags.Static | BindingFlags.NonPublic)
            ?.SetValue(null, null);
    }

    [Test]
    public void Build_创建根Canvas与全部页面与TabBar()
    {
        _shell = new GameObject("AppShellUT");
        var shell = _shell.AddComponent<AppShell>();

        // Build 为私有方法(正常由 RuntimeInitializeOnLoadMethod 驱动),测试直调
        var build = typeof(AppShell).GetMethod("Build", BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.IsNotNull(build, "AppShell.Build 应存在");
        build.Invoke(shell, null); // 若 UI 构建路径有任何异常,这里直接抛出 → 测试失败并显示真实堆栈

        // 根 Canvas 已登记
        Assert.IsNotNull(UIShell.CanvasTransform, "UIShell.CanvasTransform 应已赋值");

        // 四个页面全部注册且可导航
        Assert.IsTrue(PageRouter.TryNavigateTo(nameof(MapHomePage)), "地图页应可导航");
        Assert.IsTrue(PageRouter.TryNavigateTo(nameof(StoreHomePage)), "商店页应可导航");
        Assert.IsTrue(PageRouter.TryNavigateTo(nameof(ProfileHomePage)), "我的页应可导航");
        Assert.IsTrue(PageRouter.TryNavigateTo(nameof(ArCameraEntryPage)), "AR 相机页应可导航");

        // TabBar 实体在 Canvas 下
        var tabbar = _shell.transform.root.GetComponentInChildren<Transform>();// 兜底
        Assert.IsNotNull(UIShell.CanvasTransform.Find("TabBar") ?? FindDeep(UIShell.CanvasTransform, "TabBar"), "Canvas 下应有 TabBar");
        Assert.IsTrue(UIShell.TabBarVisible, "普通页 TabBar 应可见(A-701)");

        // AR 页导航后 TabBar 隐藏
        PageRouter.TryNavigateTo(nameof(ArCameraEntryPage));
        Assert.IsFalse(UIShell.TabBarVisible, "AR 会话应豁免 TabBar(A-701)");
    }

    private static Transform FindDeep(Transform parent, string name)
    {
        foreach (Transform child in parent)
        {
            if (child.name == name)
            {
                return child;
            }
            var found = FindDeep(child, name);
            if (found != null)
            {
                return found;
            }
        }
        return null;
    }
}
