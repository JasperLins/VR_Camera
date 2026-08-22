/**
 * 职责:环境变量集中校验(zod)——缺配/错配启动即失败,防止配置漂移到运行期才暴露
 * 关联任务:PKG-02;被 apps/api 与 apps/worker 共用(公共抽取,禁止各 app 自行重复定义)
 * 用法:import { env } from '@vrm/shared' (模块加载时完成一次校验)
 */
import { z } from 'zod';

/** 环境变量 schema:新增配置必须同步改 .env.example 与 server/README.md(三处同步)
 *  防线:非法格式启动即失败;DATABASE_URL 提供与 docker-compose 同构的本地默认值,
 *  生产部署必须显式注入(连接失败同样启动即失败);生产携带开发 JWT 密钥直接拒绝启动 */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgresql://vr:vrmemento@127.0.0.1:55432/vrmemento?schema=public'),
    REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
    JWT_SECRET: z.string().min(16).default('dev-insecure-jwt-secret-change-me'),
    WECHAT_APPID: z.string().optional(),
    WECHAT_SECRET: z.string().optional(),
    /** 3D 生成服务商:mock(默认,本地全链联调)/ meshy(待 PR-3 预研后实装) */
    GEN3D_PROVIDER: z.enum(['mock', 'meshy']).default('mock'),
    /** mock 供应商单任务模拟时长(毫秒) */
    MOCK_GEN_DELAY_MS: z.coerce.number().int().min(100).default(4000),
    /** mock 供应商注入失败率(0-1,测试/演练用) */
    MOCK_GEN_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
    /** 生成任务提交超时(毫秒):DEDUCTED 停滞超过该时长未受理 → REFUNDED_ALL */
    GEN_SUBMIT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(300_000),
    /** Meshy API key(人工环节;留空时 meshy 适配器明确报 50001) */
    MESHY_API_KEY: z.string().optional(),
    /** 内容安全敏感词(mock 机审用,逗号分隔;真实供应商接入属人工批次) */
    CONTENT_SAFETY_WORDS: z.string().default('')
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-insecure-jwt-secret-change-me') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: '生产环境必须显式配置 JWT_SECRET(开发默认密钥禁止上生产)'
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** 纯函数:校验任意输入(便于单测);失败抛 zod 聚合错误,错误信息含全部缺配项 */
export function validateEnv(input: unknown): Env {
  return EnvSchema.parse(input);
}

/** 进程级单例:模块首次导入时校验并固化 */
export const env: Env = validateEnv(process.env);
