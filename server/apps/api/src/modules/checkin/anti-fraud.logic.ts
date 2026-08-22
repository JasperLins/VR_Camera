/**
 * 职责:防刷规则引擎(纯函数)——同内容一次/最低字数/新号冷却/每日上限/设备指纹五规则
 * 关联需求:FR-08;关联任务:PKG-18(P-4/T13);验收线:防刷规则全表单测
 * 口径:规则集可配置(阈值集中导出);违规返回规则 id 列表,调用方映射文案
 */

export const ANTI_FRAUD_RULES = Object.freeze({
  SAME_CONTENT_ONCE: 'same-content-once',
  MIN_LENGTH: 'min-length',
  NEW_ACCOUNT_COOLDOWN: 'new-account-cooldown',
  DAILY_CAP: 'daily-cap',
  DEVICE_FINGERPRINT: 'device-fingerprint'
} as const);

export type AntiFraudRuleId = (typeof ANTI_FRAUD_RULES)[keyof typeof ANTI_FRAUD_RULES];

/** 规则阈值(tech-stack §6 R5:账本幂等之外的服务端统一防线) */
export const ANTI_FRAUD_CONFIG = Object.freeze({
  /** 评论/文本类最低字数 */
  MIN_TEXT_LENGTH: 5,
  /** 新号冷却时长(小时) */
  NEW_ACCOUNT_COOLDOWN_HOURS: 1,
  /** 文本类动作每日上限 */
  TEXT_DAILY_CAP: 50,
  /** 同设备指纹近期关联的独立账号数上限 */
  DEVICE_FINGERPRINT_MAX_ACCOUNTS: 3
} as const);

export interface AntiFraudInput {
  /** 该内容此前的同类动作数(>0 即已发生过) */
  sameContentCount: number;
  /** 文本长度(评论/留言类;打卡等无文本动作传 null 跳过该规则) */
  textLength: number | null;
  /** 账号年龄(小时) */
  accountAgeHours: number;
  /** 该用户今日同类动作数(含本次前) */
  dailyCount: number;
  /** 同设备指纹近期关联的独立账号数(1 = 仅本人) */
  deviceFingerprintAccounts: number | null;
  /** 每日上限覆盖(默认文本类口径;打卡等动作传各自的上限,FR-05:打卡日上限 10 积分=5 次) */
  dailyCap?: number;
}

export interface AntiFraudResult {
  allowed: boolean;
  violations: AntiFraudRuleId[];
}

/** 规则全表评估(纯函数;不抛错,由调用方决定语义) */
export function evaluateAntiFraud(input: AntiFraudInput): AntiFraudResult {
  const violations: AntiFraudRuleId[] = [];

  if (input.sameContentCount > 0) {
    violations.push(ANTI_FRAUD_RULES.SAME_CONTENT_ONCE);
  }
  if (input.textLength !== null && input.textLength < ANTI_FRAUD_CONFIG.MIN_TEXT_LENGTH) {
    violations.push(ANTI_FRAUD_RULES.MIN_LENGTH);
  }
  if (input.accountAgeHours < ANTI_FRAUD_CONFIG.NEW_ACCOUNT_COOLDOWN_HOURS) {
    violations.push(ANTI_FRAUD_RULES.NEW_ACCOUNT_COOLDOWN);
  }
  const dailyCap = input.dailyCap ?? ANTI_FRAUD_CONFIG.TEXT_DAILY_CAP;
  if (input.dailyCount >= dailyCap) {
    violations.push(ANTI_FRAUD_RULES.DAILY_CAP);
  }
  if (
    input.deviceFingerprintAccounts !== null &&
    input.deviceFingerprintAccounts > ANTI_FRAUD_CONFIG.DEVICE_FINGERPRINT_MAX_ACCOUNTS
  ) {
    violations.push(ANTI_FRAUD_RULES.DEVICE_FINGERPRINT);
  }

  return { allowed: violations.length === 0, violations };
}

/** 违规规则 → 用户可读文案(客户端 toast 口径) */
export function antiFraudMessage(violations: AntiFraudRuleId[]): string {
  const map: Record<AntiFraudRuleId, string> = {
    [ANTI_FRAUD_RULES.SAME_CONTENT_ONCE]: '相同内容已提交过,请勿重复',
    [ANTI_FRAUD_RULES.MIN_LENGTH]: `内容太短(至少 ${ANTI_FRAUD_CONFIG.MIN_TEXT_LENGTH} 字)`,
    [ANTI_FRAUD_RULES.NEW_ACCOUNT_COOLDOWN]: '新账号冷却中,稍后再试',
    [ANTI_FRAUD_RULES.DAILY_CAP]: '今日操作已达上限',
    [ANTI_FRAUD_RULES.DEVICE_FINGERPRINT]: '设备环境异常,稍后再试'
  };
  return violations.map((v) => map[v]).join(';');
}
