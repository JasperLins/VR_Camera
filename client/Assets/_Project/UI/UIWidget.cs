// 职责:UI 通用组件基类——Toast/加载态/空态的显示与隐藏骨架,视觉规格按 ui-spec v0.3.1 在 B1 落地
// 关联任务:PKG-09(A-6 通用 UI 组件库)
// 设计规范摘要(ui-spec §6):贴纸卡 2px 墨描边 + 硬偏移阴影;圆角 控件10/卡片16/胶囊999
using UnityEngine;

namespace VRM.UI
{
    /// <summary>通用组件基类:CanvasGroup 渐隐骨架</summary>
    public abstract class UIWidget : MonoBehaviour
    {
        private CanvasGroup _group;

        protected CanvasGroup Group =>
            _group != null ? _group : _group = gameObject.AddComponent<CanvasGroup>();

        public virtual void Show()
        {
            Group.alpha = 1f;
            Group.blocksRaycasts = true;
            gameObject.SetActive(true);
        }

        public virtual void Hide()
        {
            Group.alpha = 0f;
            Group.blocksRaycasts = false;
            gameObject.SetActive(false);
        }
    }
}
