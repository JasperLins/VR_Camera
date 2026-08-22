// 职责:登录态存储抽象——PlayerPrefs 实现 + 可注入接口(测试用内存实现)
// 关联任务:PKG-09(A-3);密钥红线:只存会话令牌,不存任何第三方密钥
using UnityEngine;

namespace VRM.Auth
{
    public interface IAuthStorage
    {
        string Get(string key);
        void Set(string key, string value);
        void Remove(string key);
    }

    /// <summary>运行期实现:PlayerPrefs 持久化(设备标识与会话令牌)</summary>
    public sealed class PlayerPrefsAuthStorage : IAuthStorage
    {
        public string Get(string key)
        {
            return PlayerPrefs.GetString(key, string.Empty);
        }

        public void Set(string key, string value)
        {
            PlayerPrefs.SetString(key, value);
            PlayerPrefs.Save();
        }

        public void Remove(string key)
        {
            PlayerPrefs.DeleteKey(key);
            PlayerPrefs.Save();
        }
    }
}
