/**
 * 职责:内容机审统一入口——ContentSafetyProvider 抽象 + mock 适配器(配置化敏感词)+ 全量留痕
 * 关联需求:FR-12(R-1);关联任务:PKG-17(T10);真实供应商(阿里云内容安全/腾讯天御)属人工批次
 * 口径:所有机审调用(含通过)一律插入 moderation_records;REJECT 由调用方决定阻断/标记
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModerationScene, ModerationVerdict } from '@vrm/database';
import { env } from '@vrm/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** 机审供应商结果契约(真实供应商适配器实现同一接口) */
export interface ContentSafetyProvider {
  readonly name: string;
  checkText(text: string): { verdict: ModerationVerdict; riskWords: string[] };
}

/** mock 适配器:敏感词来自 CONTENT_SAFETY_WORDS(逗号分隔)+ 内置演示词表 */
@Injectable()
export class MockContentSafetyProvider implements ContentSafetyProvider {
  readonly name = 'mock';
  private readonly words: string[];

  constructor() {
    const builtin = ['赌博', '代开发票', '枪支买卖'];
    this.words = [
      ...builtin,
      ...env.CONTENT_SAFETY_WORDS.split(',')
        .map((w) => w.trim())
        .filter(Boolean)
    ];
  }

  checkText(text: string): { verdict: ModerationVerdict; riskWords: string[] } {
    const riskWords = this.words.filter((w) => text.includes(w));
    if (riskWords.length > 0) {
      return { verdict: ModerationVerdict.REJECT, riskWords };
    }
    return { verdict: ModerationVerdict.PASS, riskWords: [] };
  }
}

export interface SafetyCheckResult {
  verdict: ModerationVerdict;
  riskWords: string[];
  /** 留痕记录 id */
  recordId: string;
}

@Injectable()
export class ContentSafetyService {
  private readonly logger = new Logger(ContentSafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CONTENT_SAFETY_PROVIDER') private readonly provider: ContentSafetyProvider
  ) {}

  /**
   * 文本机审 + 留痕(举报文本/昵称/标题等触点统一走这里):
   * provider 异常时降级 MARK_REVIEW(进人工复核),不阻断主链路。
   */
  async checkText(
    scene: ModerationScene,
    targetType: string,
    targetId: string,
    text: string
  ): Promise<SafetyCheckResult> {
    let verdict: ModerationVerdict;
    let riskWords: string[] = [];
    try {
      const result = this.provider.checkText(text);
      verdict = result.verdict;
      riskWords = result.riskWords;
    } catch (err) {
      this.logger.warn(`safety provider down, fallback MARK_REVIEW: ${(err as Error).message}`);
      verdict = ModerationVerdict.MARK_REVIEW;
    }

    const record = await this.prisma.moderationRecord.create({
      data: {
        scene,
        targetType,
        targetId,
        provider: this.provider.name,
        verdict,
        riskWords,
        detail: { text: text.slice(0, 500) }
      },
      select: { id: true }
    });
    return { verdict, riskWords, recordId: record.id };
  }
}
