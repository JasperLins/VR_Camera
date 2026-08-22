// 职责:TabBar 规格——4 格布局(地图|AR相机凸起|商店|我的)与豁免声明,数据与视图分离便于单测
// 关联任务:PKG-09(A-2);来源:work/UI/map-home.html TabBar 节(A-601/A-701)
using System.Collections.Generic;
using VRM.UI.Pages;

namespace VRM.UI
{
    /// <summary>单个 Tab 声明(图标先用 emoji 占位,FontAwesome 字体导入后替换,A-732)</summary>
    public readonly struct TabSpec
    {
        public readonly string PageId;
        public readonly string Label;
        public readonly string IconGlyph;

        public TabSpec(string pageId, string label, string iconGlyph)
        {
            PageId = pageId;
            Label = label;
            IconGlyph = iconGlyph;
        }
    }

    public static class TabBarSpec
    {
        /// <summary>四格顺序与原型一致:地图(0)|相机(1,中央凸起)|商店(2)|我的(3)</summary>
        public static readonly IReadOnlyList<TabSpec> Items = new[]
        {
            new TabSpec(nameof(MapHomePage), "地图", "🗺"),
            new TabSpec(string.Empty, "AR 相机", "📷"), // 中央凸起,非页面格
            new TabSpec(nameof(StoreHomePage), "商店", "🏪"),
            new TabSpec(nameof(ProfileHomePage), "我的", "👤")
        };

        public const int CameraSlotIndex = 1;

        /// <summary>默认落地页:地图发现首页(S3)</summary>
        public const string DefaultPageId = nameof(MapHomePage);
    }
}
