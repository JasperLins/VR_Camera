// 职责:TabBar 规格与贴纸主题单测——4 格布局/A-701 豁免/色板关键值锁定(A-2/A-6)
// 关联任务:PKG-09
using NUnit.Framework;
using UnityEngine;
using VRM.UI;
using VRM.UI.Pages;

public class TabBarSpecTests
{
    [Test]
    public void 四格布局_地图相机商店我的()
    {
        Assert.AreEqual(4, TabBarSpec.Items.Count);
        Assert.AreEqual(nameof(MapHomePage), TabBarSpec.Items[0].PageId);
        Assert.AreEqual(nameof(StoreHomePage), TabBarSpec.Items[2].PageId);
        Assert.AreEqual(nameof(ProfileHomePage), TabBarSpec.Items[3].PageId);
    }

    [Test]
    public void 相机在中央凸起槽位_且不是页面格()
    {
        Assert.AreEqual(1, TabBarSpec.CameraSlotIndex);
        Assert.AreEqual(string.Empty, TabBarSpec.Items[TabBarSpec.CameraSlotIndex].PageId, "相机为入口钮,非 Tab 页");
        Assert.AreEqual("AR 相机", TabBarSpec.Items[TabBarSpec.CameraSlotIndex].Label);
    }

    [Test]
    public void 默认落地页为地图发现首页_S3()
    {
        Assert.AreEqual(nameof(MapHomePage), TabBarSpec.DefaultPageId);
    }

    [Test]
    public void AR会话页声明TabBar豁免_A701()
    {
        // 反射构建页面对象验证虚属性默认与豁免声明
        var page = new GameObject("ar").AddComponent<ArCameraEntryPage>();
        try
        {
            Assert.IsFalse(page.ShowsTabBar, "AR 全屏会话不带 TabBar(A-701)");
            var plain = new GameObject("p").AddComponent<DummyPage>();
            Assert.IsTrue(plain.ShowsTabBar, "普通页默认带 TabBar");
        }
        finally
        {
            Object.DestroyImmediate(page.gameObject);
        }
    }

    private sealed class DummyPage : Page
    {
    }

    [Test]
    public void 贴纸主题_关键色值锁定_D056_D057_D059()
    {
        AssertColorsEqual("#FF6B4A", StickerTheme.Coral, "主色珊瑚橙 D-056");
        AssertColorsEqual("#FFB347", StickerTheme.Sunset, "辅色日落黄");
        AssertColorsEqual("#4ECDC4", StickerTheme.Teal, "辅色天青(图片类型色 D-057)");
        AssertColorsEqual("#F59E0B", StickerTheme.Amber, "文字类型色 D-057");
        AssertColorsEqual("#1A1410", StickerTheme.Ink, "墨色描边/硬阴影 D-059");
        AssertColorsEqual("#FFF9F5", StickerTheme.Paper, "暖白纸底");
    }

    [Test]
    public void 贴纸主题_结构参数_描边2px_硬阴影4px()
    {
        Assert.AreEqual(2f, StickerTheme.BorderPx);
        Assert.AreEqual(4f, StickerTheme.ShadowOffsetPx);
        Assert.AreEqual(10f, StickerTheme.RadiusControl);
        Assert.AreEqual(16f, StickerTheme.RadiusCard);
    }

    private static void AssertColorsEqual(string hex, Color actual, string because)
    {
        ColorUtility.TryParseHtmlString(hex, out var expected);
        Assert.AreEqual(expected, actual, because);
    }
}
