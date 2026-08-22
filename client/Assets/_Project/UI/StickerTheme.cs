// 职责:贴纸设计令牌唯一来源——色板/圆角/描边/阴影参数(ui-spec v0.3.1 §7 的代码化)
// 关联任务:PKG-09(A-6 通用组件视觉版);改色值必须同步 ui-spec,禁止在业务代码散落硬编码
using UnityEngine;

namespace VRM.UI
{
    public static class StickerTheme
    {
        // ---- 色板(ui-spec §7.1) ----
        public static readonly Color Ink = Hex("#1A1410");           // 墨色:描边/正文/硬阴影
        public static readonly Color Coral = Hex("#FF6B4A");         // 主色珊瑚橙(D-056)
        public static readonly Color CoralPressed = Hex("#E8552F");  // 主色按压
        public static readonly Color Sunset = Hex("#FFB347");        // 辅色日落黄
        public static readonly Color Teal = Hex("#4ECDC4");          // 辅色天青(图片类型色 D-057)
        public static readonly Color Amber = Hex("#F59E0B");         // 文字类型色(D-057)
        public static readonly Color Paper = Hex("#FFF9F5");         // 页面暖白底
        public static readonly Color Cream = Hex("#FFEED9");         // 次背景奶油块
        public static readonly Color InkSecondary = Hex("#6F6259");  // 墨色次级文字
        public static readonly Color Success = Hex("#1DC981");       // 成功
        public static readonly Color Danger = Hex("#E8463A");        // 危险
        public static readonly Color White = Color.white;

        // ---- 结构参数 ----
        public const float BorderPx = 2f;        // 全站描边 2px
        public const float ShadowOffsetPx = 4f;  // 硬偏移阴影 4px 4px 0(D-059)
        public const float RadiusControl = 10f;  // 控件圆角
        public const float RadiusCard = 16f;     // 卡片圆角
        public const float RadiusPill = 999f;    // 胶囊

        // ---- 字号(基线 24/20/16/14/12 + 展示字层 44/32,A-714) ----
        public const int DisplaySize = 44;
        public const int TitleSize = 24;
        public const int BodySize = 16;
        public const int CaptionSize = 12;

        /// <summary>相机凸起钮渐变(霓虹强调仅三处之一,A-711)</summary>
        public static readonly Color CameraGradientFrom = Coral;
        public static readonly Color CameraGradientTo = Sunset;

        private static Color Hex(string hex)
        {
            return ColorUtility.TryParseHtmlString(hex, out var color) ? color : Color.magenta;
        }
    }
}
