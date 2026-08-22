/**
 * 职责:锚点放置与管理服务——放置(即刻可见)/详情(含 AI 标识)/隐藏/重开恢复原位/软删除 30 天回收/授权名单/口令
 * 关联需求:FR-03/FR-06;关联任务:PKG-16/15(N-1/N-3/N-4,T14/T15)
 * 口径:隐藏=HIDDEN(数据保留);重开=恢复原坐标原状态;删除=DELETED 软删,30 天回收期内可恢复
 */
import { Inject, Injectable } from '@nestjs/common';
import { Anchor, AnchorStatus, AnchorVisibility, ModerationScene } from '@vrm/database';
import { AppErrorCode } from '@vrm/shared';
import type Redis from 'ioredis';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { ContentSafetyService } from '../safety/content-safety.service';
import {
  expiresAtFrom,
  ExpiryOption,
  generateShareToken,
  hashShareToken,
  PASSCODE_COOLDOWN_SECONDS,
  PASSCODE_MAX_ATTEMPTS,
  validatePlacement
} from './anchor.logic';

@Injectable()
export class AnchorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: ContentSafetyService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  /** 放置内容:标题机审(REJECT 阻断)+ 落库即刻可见(FR-03 一句线) */
  async place(
    userId: string,
    input: {
      title: string;
      contentType: 'MODEL' | 'IMAGE' | 'TEXT';
      contentRef?: string;
      latitude: number;
      longitude: number;
      altitude: number;
      visibility: AnchorVisibility;
      expiry: ExpiryOption;
      aiGenerated?: boolean;
    }
  ): Promise<Anchor> {
    const placementError = validatePlacement(input);
    if (placementError) {
      throw BizException.of(AppErrorCode.INVALID_PARAM, placementError);
    }

    const check = await this.safety.checkText(ModerationScene.ANCHOR_TITLE, 'anchor-draft', userId, input.title);
    if (check.verdict === 'REJECT') {
      throw BizException.of(AppErrorCode.INVALID_PARAM, '标题含违规内容,请修改后重试');
    }

    return this.prisma.anchor.create({
      data: {
        userId,
        title: input.title,
        contentType: input.contentType,
        contentRef: input.contentRef ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        altitude: input.altitude,
        visibility: input.visibility,
        status: AnchorStatus.VISIBLE,
        aiGenerated: input.aiGenerated ?? false,
        expiresAt: expiresAtFrom(input.expiry)
      }
    });
  }

  /** 详情:作者/授权名单/口令通过者可见(R-4:aiGenerated 下发) */
  async getDetail(userId: string, anchorId: string): Promise<Anchor & { recycleDeadline: Date | null }> {
    const anchor = await this.prisma.anchor.findUnique({ where: { id: anchorId } });
    if (!anchor) {
      throw BizException.of(AppErrorCode.ANCHOR_NOT_FOUND, '锚点不存在');
    }
    if (!(await this.canView(userId, anchor))) {
      throw BizException.of(AppErrorCode.PRIVATE_CONTENT_DENIED, '私密内容,需作者授权或口令');
    }
    return anchor;
  }

  /** 私密可见性判定:作者/授权名单/口令会话三通道(口令会话存 Redis,24h) */
  async canView(userId: string, anchor: { id: string; userId: string; visibility: AnchorVisibility }): Promise<boolean> {
    if (anchor.visibility === AnchorVisibility.PUBLIC) {
      return true;
    }
    if (anchor.userId === userId) {
      return true;
    }
    const granted = await this.prisma.anchorGrant.findUnique({
      where: { anchorId_granteeId: { anchorId: anchor.id, granteeId: userId } }
    });
    if (granted) {
      return true;
    }
    const pass = await this.redis.get(`passcode:ok:${anchor.id}:${userId}`);
    return pass === '1';
  }

  /** 我的内容管理三态列表(可见/已隐藏/已删除;回收站带倒计时) */
  async listMine(userId: string, status: AnchorStatus, page: number, pageSize: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.anchor.findMany({
        where: { userId, status },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.anchor.count({ where: { userId, status } })
    ]);
    return {
      items: items.map((a) => ({
        ...a,
        recycleDeadline: a.status === AnchorStatus.DELETED && a.expiresAt === null ? null : null
      })),
      total,
      page,
      pageSize
    };
  }

  /** 隐藏(数据保留,取景框即刻消失) */
  async hide(userId: string, anchorId: string): Promise<Anchor> {
    return this.transitionOwn(userId, anchorId, [
      { from: AnchorStatus.VISIBLE, to: AnchorStatus.HIDDEN }
    ]);
  }

  /** 重开:恢复原坐标原状态(FR-06 一句线;到期隐藏的可重新计时) */
  async reopen(userId: string, anchorId: string, expiry?: ExpiryOption): Promise<Anchor> {
    const anchor = await this.getOwn(userId, anchorId);
    if (anchor.status === AnchorStatus.DELETED) {
      // 回收期内恢复:回到 HIDDEN(用户确认后自行重开,防误恢复即公开)
      const deadline = anchor.updatedAt.getTime() + 30 * 24 * 3600 * 1000;
      if (Date.now() > deadline) {
        throw BizException.of(AppErrorCode.NOT_FOUND, '已过 30 天回收期,内容已清理');
      }
      return this.prisma.anchor.update({
        where: { id: anchorId },
        data: { status: AnchorStatus.HIDDEN }
      });
    }
    const updated = await this.prisma.anchor.update({
      where: { id: anchorId },
      data: {
        status: AnchorStatus.VISIBLE,
        ...(expiry ? { expiresAt: expiresAtFrom(expiry) } : {})
      }
    });
    return updated;
  }

  /** 软删除:DELETED + 回收字段(updatedAt 起 30 天;到期由后台物理清理) */
  async remove(userId: string, anchorId: string): Promise<Anchor> {
    return this.transitionOwn(userId, anchorId, [
      { from: AnchorStatus.VISIBLE, to: AnchorStatus.DELETED },
      { from: AnchorStatus.HIDDEN, to: AnchorStatus.DELETED }
    ]);
  }

  // ---- N-4 授权与口令 ----

  /** 作者追加授权好友(重复授权幂等) */
  async grant(userId: string, anchorId: string, granteeId: string): Promise<void> {
    const anchor = await this.getOwn(userId, anchorId);
    if (anchor.visibility !== AnchorVisibility.PRIVATE) {
      throw BizException.of(AppErrorCode.STATE_CONFLICT, '仅私密内容支持授权名单');
    }
    await this.prisma.anchorGrant.upsert({
      where: { anchorId_granteeId: { anchorId, granteeId } },
      create: { anchorId, granteeId, grantedById: userId },
      update: {}
    });
    // 移除后重新上锁由 canView 天然实现;追加授权即刻生效
  }

  /** 作者移除授权(对方取景框重新上锁消失,UX §4.5) */
  async revoke(userId: string, anchorId: string, granteeId: string): Promise<void> {
    await this.getOwn(userId, anchorId);
    await this.prisma.anchorGrant.deleteMany({ where: { anchorId, granteeId } });
    await this.redis.del(`passcode:ok:${anchorId}:${granteeId}`); // 口令会话一并失效
  }

  /** 生成口令(明文仅本次返回;库内 sha256;旧口令作废) */
  async createPasscode(userId: string, anchorId: string): Promise<{ token: string; expiresAt: Date | null }> {
    const anchor = await this.getOwn(userId, anchorId);
    if (anchor.visibility !== AnchorVisibility.PRIVATE) {
      throw BizException.of(AppErrorCode.STATE_CONFLICT, '仅私密内容支持口令');
    }
    const token = generateShareToken();
    await this.prisma.shareToken.updateMany({
      where: { anchorId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await this.prisma.shareToken.create({
      data: { anchorId, tokenHash: hashShareToken(token) }
    });
    return { token, expiresAt: null };
  }

  /** 口令校验:5 次失败冷却 10 分钟;通过获得 24h 可见会话 */
  async verifyPasscode(userId: string, anchorId: string, token: string): Promise<{ unlocked: boolean; message: string }> {
    const failKey = `passcode:fail:${anchorId}:${userId}`;
    const fails = Number(await this.redis.get(failKey) ?? 0);
    if (fails >= PASSCODE_MAX_ATTEMPTS) {
      const ttl = await this.redis.ttl(failKey);
      return { unlocked: false, message: `失败次数过多,请 ${Math.max(1, ttl)} 秒后再试` };
    }

    const active = await this.prisma.shareToken.findFirst({
      where: { anchorId, revokedAt: null, tokenHash: hashShareToken(token) }
    });
    if (active) {
      await this.redis.set(`passcode:ok:${anchorId}:${userId}`, '1', 'EX', 24 * 3600);
      await this.redis.del(failKey);
      return { unlocked: true, message: '已解锁' };
    }

    await this.redis.multi().incr(failKey).expire(failKey, PASSCODE_COOLDOWN_SECONDS).exec();
    const left = PASSCODE_MAX_ATTEMPTS - fails - 1;
    return {
      unlocked: false,
      message: left > 0 ? `口令错误,还可尝试 ${left} 次` : '口令错误,已进入冷却(10 分钟)'
    };
  }

  // ---- 内部 ----

  private async getOwn(userId: string, anchorId: string): Promise<Anchor> {
    const anchor = await this.prisma.anchor.findUnique({ where: { id: anchorId } });
    if (!anchor || anchor.userId !== userId) {
      throw BizException.of(AppErrorCode.ANCHOR_NOT_FOUND, '锚点不存在');
    }
    return anchor;
  }

  private async transitionOwn(
    userId: string,
    anchorId: string,
    transitions: Array<{ from: AnchorStatus; to: AnchorStatus }>
  ): Promise<Anchor> {
    const anchor = await this.getOwn(userId, anchorId);
    const match = transitions.find((t) => t.from === anchor.status);
    if (!match) {
      throw BizException.of(
        AppErrorCode.STATE_CONFLICT,
        `当前状态 ${anchor.status} 不支持该操作(合法状态: ${transitions.map((t) => t.from).join('/')})`
      );
    }
    return this.prisma.anchor.update({ where: { id: anchorId }, data: { status: match.to } });
  }
}
