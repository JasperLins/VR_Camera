/**
 * 职责:认证服务单测——游客复用/新用户赠送/微信未配置防线/封禁会话失效(PKG-08)
 */
import { JwtService } from '@nestjs/jwt';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../ledger/token.service';
import { AuthService } from './auth.service';

function createFakes() {
  const users = new Map<string, any>();
  const identities: any[] = [];
  let seq = 0;

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.get(where.id) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const user = { id: `u-${++seq}`, role: 'USER', status: 'ACTIVE', ...data };
        users.set(user.id, user);
        return user;
      })
    },
    authIdentity: {
      findUnique: jest.fn(async ({ where }: any) =>
        identities.find((i) => i.provider === where.provider_providerUserId.provider && i.providerUserId === where.provider_providerUserId.providerUserId) ?? null
      ),
      create: jest.fn(async ({ data }: any) => {
        const record = { ...data, user: users.get(data.userId) };
        identities.push(record);
        return record;
      })
    }
  } as unknown as PrismaService;

  const jwt = new JwtService({ secret: 'unit-test-secret-at-least-16ch' });
  const tokenService = { grantRegister: jest.fn(async () => ({ created: true, balanceAfter: 80, entryId: 'e1' })) };
  return { prisma, jwt, tokenService: tokenService as unknown as TokenService, users };
}

describe('AuthService.guestLogin', () => {
  it('新 deviceId:建用户+身份+注册赠送,返回 JWT', async () => {
    const f = createFakes();
    const service = new AuthService(f.prisma, f.jwt, f.tokenService);

    const result = await service.guestLogin('device-abcdef12');

    expect(result.isNewUser).toBe(true);
    expect(result.user.nickname).toContain('游客');
    expect(f.tokenService.grantRegister).toHaveBeenCalledTimes(1);
    const decoded = f.jwt.decode(result.token) as { sub: string };
    expect(decoded.sub).toBe(result.user.id);
  });

  it('同 deviceId 二次登录:复用账号不重复赠送', async () => {
    const f = createFakes();
    const service = new AuthService(f.prisma, f.jwt, f.tokenService);

    const first = await service.guestLogin('device-abcdef12');
    const second = await service.guestLogin('device-abcdef12');

    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(f.tokenService.grantRegister).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.wechatLogin', () => {
  it('未配置 WECHAT_APPID/SECRET:抛 DEPENDENCY_UNAVAILABLE(资质人工环节防线)', async () => {
    const f = createFakes();
    const service = new AuthService(f.prisma, f.jwt, f.tokenService);

    await expect(service.wechatLogin('any-code')).rejects.toBeInstanceOf(BizException);
    expect(f.prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.validateTokenPayload', () => {
  it('封禁用户会话立即失效', async () => {
    const f = createFakes();
    const banned = { id: 'u-banned', status: 'BANNED', role: 'USER' };
    f.users.set('u-banned', banned);
    const service = new AuthService(f.prisma, f.jwt, f.tokenService);

    await expect(service.validateTokenPayload({ sub: 'u-banned' })).rejects.toBeInstanceOf(BizException);
    await expect(service.validateTokenPayload({ sub: 'u-missing' })).rejects.toBeInstanceOf(BizException);
  });
});
