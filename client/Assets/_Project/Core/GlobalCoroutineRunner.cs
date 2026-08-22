// 职责:全局协程运行器——为静态上下文(如 ApiClient)提供 StartCoroutine 宿主
// 关联任务:PKG-09(A-5 网络层依赖)
using UnityEngine;

namespace VRM.Core
{
    public sealed class GlobalCoroutineRunner : MonoBehaviour
    {
        private static GlobalCoroutineRunner _instance;

        /// <summary>懒加载单例(DontDestroyOnLoad);场景切换不销毁</summary>
        public static GlobalCoroutineRunner Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject(nameof(GlobalCoroutineRunner));
                    _instance = go.AddComponent<GlobalCoroutineRunner>();
                    DontDestroyOnLoad(go);
                }

                return _instance;
            }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
            }
        }
    }
}
