// 职责:登录态 DTO——与服务端 /v1/auth 信封 data 结构一一对应(改契约双侧同步)
// 关联任务:PKG-09(A-3)/ PKG-08(L-5)
namespace VRM.Auth
{
    [System.Serializable]
    public class GuestLoginRequest
    {
        public string deviceId;
    }

    [System.Serializable]
    public class UserInfoDto
    {
        public string id;
        public string nickname;
        public string avatarUrl;
        public string role;
    }

    [System.Serializable]
    public class AuthResultDto
    {
        public string token;
        public UserInfoDto user;
        public bool isNewUser;
    }
}
