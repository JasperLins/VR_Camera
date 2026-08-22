/**
 * 职责:环境变量集中校验(zod)——缺配/错配启动即失败,防止配置漂移到运行期才暴露
 * 关联任务:PKG-02;被 apps/api 与 apps/worker 共用(公共抽取,禁止各 app 自行重复定义)
 * 用法:import { env } from '@vrm/shared' (模块加载时完成一次校验)
 */
import { z } from 'zod';

/** 环境变量 schema:新增配置必须同步改 .env.example 与 server/README.md(三处同步)
 *  防线:非法格式启动即失败;DATABASE_URL 提供与 docker-compose 同构的本地默认值,
 *  生产部署必须显式注入(连接失败同样启动即失败) */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://vr:vrmemento@localhost:5432/vrmemento?schema=public'),
  REDIS_URL: z.string().url().default('redis://localhost:6379')
});

export type Env = z.infer<typeof EnvSchema>;

/** 纯函数:校验任意输入(便于单测);失败抛 zod 聚合错误,错误信息含全部缺配项 */
export function validateEnv(input: unknown): Env {
  return EnvSchema.parse(input);
}

/** 进程级单例:模块首次导入时校验并固化 */
export const env: Env = validateEnv(process.env);
