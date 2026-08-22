/**
 * 职责:业务常量守卫单测——数值与移交包决策(D-047/049/009)一致,防止误改
 * 关联任务:PKG-13/18 前置
 */
import { GEO_DEFAULTS, POINTS_RULES, QUEUE, TOKEN_ECONOMY } from './constants';

describe('constants', () => {
  it('Token 经济:生成 60/次、注册赠 80、10 积分=1 Token(D-047/049/009)', () => {
    expect(TOKEN_ECONOMY.GENERATION_COST).toBe(60);
    expect(TOKEN_ECONOMY.REGISTER_GRANT).toBe(80);
    expect(TOKEN_ECONOMY.POINTS_PER_TOKEN).toBe(10);
  });

  it('积分规则:打卡 +2、日上限 10(FR-05/S-1)', () => {
    expect(POINTS_RULES.CHECKIN_REWARD).toBe(2);
    expect(POINTS_RULES.CHECKIN_DAILY_CAP).toBe(10);
  });

  it('地理默认:半径 500m、上限 5km、海拔 ±5m(A-407/D-012)', () => {
    expect(GEO_DEFAULTS.RADIUS_METERS).toBe(500);
    expect(GEO_DEFAULTS.RADIUS_MAX).toBe(5000);
    expect(GEO_DEFAULTS.ALTITUDE_TOLERANCE).toBe(5);
    expect(GEO_DEFAULTS.RADIUS_OPTIONS).toEqual([500, 1000, 5000]);
  });

  it('队列名带 vrm 前缀,防止与其他业务共用 Redis 时撞名', () => {
    expect(QUEUE.GENERATION).toMatch(/^vrm\./);
    expect(QUEUE.LIFECYCLE_SCAN).toMatch(/^vrm\./);
  });
});
