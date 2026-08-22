// 职责:页面路由/页面栈——App 壳导航唯一入口;禁止场景直跳与 GetComponent 式跨页调用
// 关联任务:PKG-09(A-2 App 壳与页面导航框架)
// 深链路由 G3(未登录先登录再落地)在登录模块就绪后由本类扩展接入
using System;
using System.Collections.Generic;
using UnityEngine;

namespace VRM.UI
{
    public static class PageRouter
    {
        private static readonly Dictionary<string, Page> Pages = new Dictionary<string, Page>();
        private static readonly Stack<Page> Stack = new Stack<Page>();

        private static Page _current;

        public static string CurrentPageId => _current?.PageId ?? string.Empty;

        /// <summary>导航完成通知(参数=当前页);AppShell 据此切换 TabBar 显隐(A-701)</summary>
        public static event Action<Page> Navigated;

        public static void Register(Page page)
        {
            if (page == null)
            {
                throw new ArgumentNullException(nameof(page));
            }

            Pages[page.PageId] = page;
            page.OnHide();
        }

        public static bool TryNavigateTo(string pageId, object param = null)
        {
            if (!Pages.TryGetValue(pageId, out var target))
            {
                Debug.LogWarning($"[PageRouter] 页面未注册: {pageId}");
                return false;
            }

            if (_current != null)
            {
                if (_current.PushToStack)
                {
                    Stack.Push(_current);
                }

                _current.OnHide();
            }

            _current = target;
            target.OnShow(param);
            Navigated?.Invoke(target);
            return true;
        }

        public static void Back()
        {
            if (_current == null)
            {
                return;
            }

            _current.OnHide();

            if (Stack.Count == 0)
            {
                Debug.Log("[PageRouter] 已到栈底(首页)");
                _current = null;
                return;
            }

            _current = Stack.Pop();
            _current.OnShow(null);
            Navigated?.Invoke(_current);
        }

        /// <summary>测试/重登清场用</summary>
        public static void Reset()
        {
            Stack.Clear();
            _current = null;
        }
    }
}
