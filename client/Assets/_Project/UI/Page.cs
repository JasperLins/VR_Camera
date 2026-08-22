// 职责:页面基类——32 屏的统一抽象;所有页面继承本类并经 PageRouter 注册路由
// 关联任务:PKG-09(A-2 页面导航框架);TabBar 豁免规则见 ui-spec A-701
// 约定:页面不直接互相引用,NavigateTo(pageId, param) 是唯一跳转方式
using UnityEngine;

namespace VRM.UI
{
    public abstract class Page : MonoBehaviour
    {
        /// <summary>路由 ID(默认取类名;与 UI 原型屏名对照见 client/README.md)</summary>
        public virtual string PageId => GetType().Name;

        /// <summary>是否参与页面栈 Back 导航(AR 全屏会话等豁免屏返回 false)</summary>
        public virtual bool PushToStack => true;

        /// <summary>是否显示 TabBar(A-701 豁免:S1/S2 与 AR 全屏会话 S5-S20、S32 返回 false)</summary>
        public virtual bool ShowsTabBar => true;

        /// <summary>每次显示时回调(param 来自 NavigateTo 的透传)</summary>
        public virtual void OnShow(object param)
        {
            gameObject.SetActive(true);
        }

        /// <summary>隐藏时回调(路由切换前调用;用于停动画/停协程)</summary>
        public virtual void OnHide()
        {
            gameObject.SetActive(false);
        }
    }
}
