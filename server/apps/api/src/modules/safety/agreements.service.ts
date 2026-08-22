/**
 * 职责:协议版本与同意留痕——敏感权限逐项单独同意(D-031)/首启隐私总览/人脸照片拒绝即阻断
 * 关联需求:FR-02(R-5);关联任务:PKG-17(T10);协议 key 枚举收敛于此,客户端对照同名常量
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgreementVersion, ConsentRecord } from '@vrm/database';
import { PrismaService } from '../../common/prisma/prisma.service';

/** 敏感权限/协议 key 注册表(D-031:逐项单独同意,禁止打包一次同意) */
export const AGREEMENT_KEYS = Object.freeze({
  PRIVACY_OVERVIEW: 'privacy-overview',
  CAMERA: 'camera',
  LOCATION: 'location',
  ALBUM: 'album',
  FACE_PHOTO: 'face-photo'
} as const);

export type AgreementKey = (typeof AGREEMENT_KEYS)[keyof typeof AGREEMENT_KEYS];

export const AGREEMENT_KEY_VALUES = Object.values(AGREEMENT_KEYS) as string[];

/** 内置协议版本(内容 url 待法务定稿后替换;版本升级走数据而非代码) */
const BUILTIN_VERSIONS: Array<{ key: string; version: string; title: string }> = [
  { key: AGREEMENT_KEYS.PRIVACY_OVERVIEW, version: '1.0.0', title: '隐私政策总览' },
  { key: AGREEMENT_KEYS.CAMERA, version: '1.0.0', title: '相机权限使用说明' },
  { key: AGREEMENT_KEYS.LOCATION, version: '1.0.0', title: '位置权限使用说明' },
  { key: AGREEMENT_KEYS.ALBUM, version: '1.0.0', title: '相册权限使用说明' },
  { key: AGREEMENT_KEYS.FACE_PHOTO, version: '1.0.0', title: '人脸照片处理单独同意(AI 生成前置)' }
];

@Injectable()
export class AgreementsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** 启动自举:内置协议版本幂等落库(存在即跳过) */
  async onModuleInit(): Promise<void> {
    for (const v of BUILTIN_VERSIONS) {
      await this.prisma.agreementVersion.upsert({
        where: { key_version: { key: v.key, version: v.version } },
        create: v,
        update: {}
      });
    }
  }

  /** 协议清单(每个 key 的当前生效版本) */
  async listLatest(): Promise<AgreementVersion[]> {
    const all = await this.prisma.agreementVersion.findMany({
      orderBy: { effectiveAt: 'desc' }
    });
    const latestByKey = new Map<string, AgreementVersion>();
    for (const v of all) {
      if (!latestByKey.has(v.key)) {
        latestByKey.set(v.key, v);
      }
    }
    return [...latestByKey.values()];
  }

  /** 记录一次同意/拒绝(拒绝也留痕;人脸照片拒绝→上传阻断由生成/上传侧依据此记录判定) */
  async recordConsent(
    userId: string,
    agreementKey: string,
    version: string,
    accepted: boolean
  ): Promise<ConsentRecord> {
    if (!AGREEMENT_KEY_VALUES.includes(agreementKey)) {
      throw Object.assign(new Error(`非法协议 key: ${agreementKey}`), { status: 400 });
    }
    const versionExists = await this.prisma.agreementVersion.findUnique({
      where: { key_version: { key: agreementKey, version } },
      select: { key: true }
    });
    if (!versionExists) {
      throw Object.assign(new Error(`协议版本不存在: ${agreementKey}@${version}`), { status: 400 });
    }
    return this.prisma.consentRecord.create({
      data: { userId, agreementKey, version, accepted }
    });
  }

  /** 我的同意状态(每 key 取最近一条) */
  async myConsents(userId: string): Promise<ConsentRecord[]> {
    const all = await this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    const latestByKey = new Map<string, ConsentRecord>();
    for (const c of all) {
      if (!latestByKey.has(c.agreementKey)) {
        latestByKey.set(c.agreementKey, c);
      }
    }
    return [...latestByKey.values()];
  }

  /** 指定 key 当前是否已同意(生成/上传链路的阻断判定) */
  async hasAccepted(userId: string, agreementKey: string): Promise<boolean> {
    const all = await this.prisma.consentRecord.findMany({
      where: { userId, agreementKey },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    return all[0]?.accepted === true;
  }
}
