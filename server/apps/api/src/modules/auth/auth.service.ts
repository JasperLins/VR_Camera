/**
 * 职责:认证服务——游客登录(deviceId 复用账号)/ 微信登录校验(开放平台移动应用)/ JWT 会话签发
 * 关联需求:FR-07;关联任务:PKG-08(L-5);决策:D-028 微信为主+短信兜底(短信二期)、D-030 游客仅浏览
 * 微信换取端点:开放平台 oauth2(移动应用 code → openid);AppSecret 只入环境变量(密钥红线)
 */
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@vrm/database';
import { AppErrorCode, env } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../ledger/token.service';

export interface AuthResult {
  token: string;
  user: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'role'>;
  isNewUser: boolean;
}

const WECHAT_TOKEN_ENDPOINT = 'https://api.weixin.qq.com/sns/oauth2/access_token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokenService: TokenService
  ) {}

  /** 游客登录:同 deviceId 复用账号(升级登录前的浏览态),新用户自动注册赠送 80 Token */
  async guestLogin(deviceId: string): Promise<AuthResult> {
    return this.loginByIdentity(AuthProvider.GUEST, deviceId, () => `游客${deviceId.slice(0, 6)}`);
  }

  /**
   * 微信登录:code 换 openid(开放平台移动应用)。
   * 资质/密钥未配置时明确报 DEPENDENCY_UNAVAILABLE(人工环节,见 work/AGENTS.md §3)。
   * TODO(PKG-08 联调):deviceId 非空时执行游客账号合并(迁移浏览数据后弃用游客身份)
   */
  async wechatLogin(code: string, deviceId?: string): Promise<AuthResult> {
    const openid = await this.exchangeWechatCode(code);
    return this.loginByIdentity(AuthProvider.WECHAT, openid, () => '微信用户', deviceId);
  }

  /** JWT 载荷校验(guard 每次请求调用);用户被封禁立即失效 */
  async validateTokenPayload(payload: { sub: string }): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'BANNED') {
      throw BizException.of(AppErrorCode.UNAUTHENTICATED, '会话无效,请重新登录');
    }
    return user;
  }

  signToken(user: Pick<User, 'id' | 'role'>): string {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }

  // ---- 内部 ----

  private async loginByIdentity(
    provider: AuthProvider,
    providerUserId: string,
    nicknameOf: () => string,
    mergeGuestDeviceId?: string
  ): Promise<AuthResult> {
    void mergeGuestDeviceId; // TODO(PKG-08):游客合并联调后启用

    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true }
    });

    if (existing) {
      return { token: this.signToken(existing.user), user: this.pick(existing.user), isNewUser: false };
    }

    const user = await this.prisma.user.create({ data: { nickname: nicknameOf() } });
    await this.prisma.authIdentity.create({
      data: { userId: user.id, provider, providerUserId }
    });
    // 注册赠送 80(D-049):幂等键 register-grant:{userId}
    await this.tokenService.grantRegister(user.id);

    return { token: this.signToken(user), user: this.pick(user), isNewUser: true };
  }

  private pick(user: User): Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'role'> {
    return { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl, role: user.role };
  }

  /** code → openid;失败(无效 code/网络)统一 401 语义,不泄露微信侧错误细节 */
  private async exchangeWechatCode(code: string): Promise<string> {
    if (!env.WECHAT_APPID || !env.WECHAT_SECRET) {
      throw BizException.of(
        AppErrorCode.DEPENDENCY_UNAVAILABLE,
        '微信登录未配置(WECHAT_APPID/WECHAT_SECRET 属人工环节,见 work/AGENTS.md §3)'
      );
    }

    const url =
      `${WECHAT_TOKEN_ENDPOINT}?appid=${encodeURIComponent(env.WECHAT_APPID)}` +
      `&secret=${encodeURIComponent(env.WECHAT_SECRET)}` +
      `&code=${encodeURIComponent(code)}&grant_type=authorization_code`;

    let payload: { openid?: string; errcode?: number };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      payload = (await response.json()) as { openid?: string; errcode?: number };
    } catch (err) {
      this.logger.warn(`wechat token exchange failed: ${(err as Error).message}`);
      throw BizException.of(AppErrorCode.DEPENDENCY_UNAVAILABLE, '微信服务暂不可用,请稍后重试');
    }

    if (!payload.openid) {
      throw BizException.of(AppErrorCode.UNAUTHENTICATED, '微信授权码无效或已过期');
    }
    return payload.openid;
  }
}
