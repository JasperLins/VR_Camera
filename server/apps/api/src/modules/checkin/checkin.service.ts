/**
 * 职责:打卡上报服务——有效打卡 +2 积分(同锚点每日首次/日上限 10)+ 防刷联动
 * 关联需求:FR-05;关联任务:PKG-18(S-1/T13);幂等键 checkin:userId:anchorId:YYYYMMDD
 * 口径:打卡数以积分流水为事实源(M-3 热门区域后续切换统计口径时直接聚合流水)
 */
import { Injectable } from '@nestjs/common';
import { PointsReason } from '@vrm/database';
import { AppErrorCode, buildIdempotencyKey, IdempotencyKind, POINTS_RULES } from '@vrm/shared';
import { BizException } from '../../common/biz.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { antiFraudMessage, evaluateAntiFraud } from './anti-fraud.logic';

/** 当日 00:00(本地口径按 UTC 天聚合,口径与「今日已获 X/10」toast 一致) */
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dateTag(d = new Date()): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService
  ) {}

  /** 打卡上报:防刷(新号冷却/日上限)→ 幂等入账 +2;重复打卡返回当日已获进度不重复入账 */
  async checkin(userId: string, anchorId: string): Promise<{
    pointsEarned: number;
    todayEarned: number;
    dailyCap: number;
    replayed: boolean;
  }> {
    const anchor = await this.prisma.anchor.findUnique({
      where: { id: anchorId },
      select: { id: true, status: true }
    });
    if (!anchor || anchor.status !== 'VISIBLE') {
      throw BizException.of(AppErrorCode.ANCHOR_NOT_FOUND, '锚点不存在或不可见');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true }
    });
    const accountAgeHours = (Date.now() - user.createdAt.getTime()) / 3_600_000;

    // 今日已获(打卡类流水合计,含此前打卡)
    const todayEarnedBefore = await this.todayCheckinEarned(userId);

    // 防刷:新号冷却(账号 < 1h)与日上限;同锚点每日首次由幂等键保证(textLength=null 跳过字数规则)
    const verdict = evaluateAntiFraud({
      sameContentCount: 0, // 幂等键层面处理,见下
      textLength: null,
      accountAgeHours,
      dailyCount: todayEarnedBefore / POINTS_RULES.CHECKIN_REWARD,
      dailyCap: POINTS_RULES.CHECKIN_DAILY_CAP / POINTS_RULES.CHECKIN_REWARD,
      deviceFingerprintAccounts: null
    });
    if (!verdict.allowed) {
      throw BizException.of(
        AppErrorCode.RATE_LIMITED,
        `${antiFraudMessage(verdict.violations)}(今日已获 ${todayEarnedBefore}/${POINTS_RULES.CHECKIN_DAILY_CAP})`
      );
    }

    const key = buildIdempotencyKey(IdempotencyKind.POINTS_GRANT, `checkin:${userId}:${anchorId}:${dateTag()}`);
    const result = await this.points.credit(
      userId,
      POINTS_RULES.CHECKIN_REWARD,
      PointsReason.CHECKIN,
      key,
      anchorId
    );

    const todayEarned = await this.todayCheckinEarned(userId);
    return {
      pointsEarned: result.created ? POINTS_RULES.CHECKIN_REWARD : 0,
      todayEarned,
      dailyCap: POINTS_RULES.CHECKIN_DAILY_CAP,
      replayed: !result.created
    };
  }

  /** 用户当日打卡积分合计(「今日已获 X/10」数据源) */
  private async todayCheckinEarned(userId: string): Promise<number> {
    const account = await this.prisma.pointsAccount.findUnique({ where: { userId } });
    if (!account) {
      return 0;
    }
    const agg = await this.prisma.pointsLedgerEntry.aggregate({
      where: {
        accountId: account.id,
        reason: PointsReason.CHECKIN,
        createdAt: { gte: startOfToday() }
      },
      _sum: { delta: true }
    });
    return agg._sum.delta ?? 0;
  }
}
