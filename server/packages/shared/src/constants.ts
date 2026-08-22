/**
 * 职责:全局业务常量唯一来源——Token/积分经济数值、队列名。禁止在业务代码中硬编码这些数字
 * 关联需求:FR-07/FR-08;关联决策:D-047(生成 ¥6/次=60 Token)/ D-049(注册赠 80)/ D-009(积分单向 10:1)
 * 关联任务:PKG-13(Token 账本)/ PKG-18(积分打卡)
 */

/** Token 经济常量(数值口径 = 移交包 §2 / FR-07 验收) */
export const TOKEN_ECONOMY = Object.freeze({
  /** 单次照片生成 3D 的 Token 消耗(¥6/次 等值,页面上只显示数值不折算人民币,D-029) */
  GENERATION_COST: 60,
  /** 新用户注册赠送(一期无充值入口,唯一获取途径之一) */
  REGISTER_GRANT: 80,
  /** 积分 → Token 单向抵扣比率(10 积分 = 1 Token,仅商店下载可用,D-009) */
  POINTS_PER_TOKEN: 10
});

/** 积分规则常量(FR-05 有效打卡奖励 / S-1 打卡上报接口) */
export const POINTS_RULES = Object.freeze({
  /** 有效打卡 +2 积分(同锚点每日首次) */
  CHECKIN_REWARD: 2,
  /** 打卡积分日上限 */
  CHECKIN_DAILY_CAP: 10
});

/** 地理查询默认参数(A-407:默认 500m,可扩 1/5km,服务端上限 5km) */
export const GEO_DEFAULTS = Object.freeze({
  RADIUS_METERS: 500,
  RADIUS_OPTIONS: [500, 1000, 5000],
  RADIUS_MAX: 5000,
  /** 海拔容差 ±5m(D-012) */
  ALTITUDE_TOLERANCE: 5
});

/** BullMQ 队列名注册表:入队方(api)与消费方(worker)必须引用同一常量,禁止裸字符串 */
export const QUEUE = Object.freeze({
  /** 3D 生成任务(PKG-14) */
  GENERATION: 'vrm.generation',
  /** 内容生命周期到期扫描(PKG-20,定时) */
  LIFECYCLE_SCAN: 'vrm.lifecycle-scan'
} as const);
