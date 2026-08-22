/**
 * 职责:防刷规则引擎全表单测(PKG-18 验收线:防刷规则全表单测全绿)
 */
import {
  ANTI_FRAUD_CONFIG,
  ANTI_FRAUD_RULES,
  antiFraudMessage,
  evaluateAntiFraud
} from './anti-fraud.logic';

const CLEAN = {
  sameContentCount: 0,
  textLength: null,
  accountAgeHours: 24,
  dailyCount: 0,
  deviceFingerprintAccounts: null
};

describe('evaluateAntiFraud 全表', () => {
  it('干净输入放行', () => {
    expect(evaluateAntiFraud(CLEAN)).toEqual({ allowed: true, violations: [] });
  });

  it('规则①同内容一次:重复内容拒绝', () => {
    const result = evaluateAntiFraud({ ...CLEAN, sameContentCount: 1 });
    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual([ANTI_FRAUD_RULES.SAME_CONTENT_ONCE]);
  });

  it('规则②最低字数:5 字以下拒绝;null(无文本动作)跳过', () => {
    const short = evaluateAntiFraud({ ...CLEAN, textLength: ANTI_FRAUD_CONFIG.MIN_TEXT_LENGTH - 1 });
    expect(short.violations).toContain(ANTI_FRAUD_RULES.MIN_LENGTH);
    const ok = evaluateAntiFraud({ ...CLEAN, textLength: ANTI_FRAUD_CONFIG.MIN_TEXT_LENGTH });
    expect(ok.allowed).toBe(true);
    const skipped = evaluateAntiFraud({ ...CLEAN, textLength: null });
    expect(skipped.allowed).toBe(true);
  });

  it('规则③新号冷却:1 小时内拒绝', () => {
    const young = evaluateAntiFraud({ ...CLEAN, accountAgeHours: 0.5 });
    expect(young.violations).toEqual([ANTI_FRAUD_RULES.NEW_ACCOUNT_COOLDOWN]);
    const old = evaluateAntiFraud({ ...CLEAN, accountAgeHours: ANTI_FRAUD_CONFIG.NEW_ACCOUNT_COOLDOWN_HOURS });
    expect(old.allowed).toBe(true);
  });

  it('规则④每日上限:达到上限拒绝(等于上限即拒,含本次前的计数)', () => {
    const at = evaluateAntiFraud({ ...CLEAN, dailyCount: ANTI_FRAUD_CONFIG.TEXT_DAILY_CAP });
    expect(at.violations).toEqual([ANTI_FRAUD_RULES.DAILY_CAP]);
    const under = evaluateAntiFraud({ ...CLEAN, dailyCount: ANTI_FRAUD_CONFIG.TEXT_DAILY_CAP - 1 });
    expect(under.allowed).toBe(true);
  });

  it('规则⑤设备指纹:超 3 个关联账号拒绝;null 跳过', () => {
    const bad = evaluateAntiFraud({ ...CLEAN, deviceFingerprintAccounts: 4 });
    expect(bad.violations).toEqual([ANTI_FRAUD_RULES.DEVICE_FINGERPRINT]);
    const ok = evaluateAntiFraud({ ...CLEAN, deviceFingerprintAccounts: ANTI_FRAUD_CONFIG.DEVICE_FINGERPRINT_MAX_ACCOUNTS });
    expect(ok.allowed).toBe(true);
  });

  it('多规则同时违规全部报告', () => {
    const result = evaluateAntiFraud({
      ...CLEAN,
      sameContentCount: 2,
      textLength: 1,
      accountAgeHours: 0.1,
      dailyCount: 100,
      deviceFingerprintAccounts: 9
    });
    expect(result.violations).toHaveLength(5);
    expect(result.allowed).toBe(false);
  });

  it('文案映射:每条规则有中文提示', () => {
    const result = evaluateAntiFraud({
      ...CLEAN,
      sameContentCount: 1,
      accountAgeHours: 0
    });
    const message = antiFraudMessage(result.violations);
    expect(message).toContain('相同内容');
    expect(message).toContain('冷却');
  });
});
