/**
 * 职责:环境变量校验单测——证明「缺配启动即失败 + 默认值兜底」两条防线生效
 * 关联任务:PKG-02
 */
import { validateEnv } from './env';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://vr:pw@localhost:5432/vrmemento' };

  it('仅提供必填项时,可选项取默认值', () => {
    const env = validateEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.REDIS_URL).toBe('redis://127.0.0.1:6379');
  });

  it('API_PORT 字符串被 coerce 为数字', () => {
    expect(validateEnv({ ...base, API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  it('缺少 DATABASE_URL 时回落本地默认值(与 docker-compose 同构,生产必须显式注入)', () => {
    const env = validateEnv({ API_PORT: '3000' });
    expect(env.DATABASE_URL).toContain('postgresql://vr:vrmemento@127.0.0.1:55432/vrmemento');
  });

  it('DATABASE_URL 提供空串时抛错(错配启动即失败)', () => {
    expect(() => validateEnv({ DATABASE_URL: '' })).toThrow();
  });

  it('非法枚举值被拒绝', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow();
    expect(() => validateEnv({ ...base, LOG_LEVEL: 'verbose' })).toThrow();
  });

  it('非法端口(0/70000)被拒绝', () => {
    expect(() => validateEnv({ ...base, API_PORT: '0' })).toThrow();
    expect(() => validateEnv({ ...base, API_PORT: '70000' })).toThrow();
  });
});
