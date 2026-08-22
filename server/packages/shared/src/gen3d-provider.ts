/**
 * 职责:Gen3D 服务商抽象——照片→3D 生成任务的统一接口(D-014 单服务商 / D-024 Meshy 主)
 * 关联需求:FR-04;关联任务:PKG-14(O-1/T7);apps/api 与 apps/worker 共用(api 侧创建、worker 侧驱动)
 * 说明:Meshy 适配器待 PR-3 预研结论后实装;Rodin 乙案(D-024)按同接口替换,状态机不动。
 */
import { randomUUID } from 'node:crypto';
import { env } from './env';
import type { GenTagParams } from './gen3d';

export interface Gen3DSubmitInput {
  taskId: string;
  photoOssKey: string;
  params: GenTagParams;
}

export interface Gen3DSubmitResult {
  providerTaskId: string;
}

export interface Gen3DPollResult {
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  progress: number;
  glbUrl?: string;
  errorCode?: string;
}

export interface Gen3DProvider {
  readonly name: string;
  /** 受理任务(拿 providerTaskId;失败抛错 → 任务 REFUNDED_ALL) */
  submit(input: Gen3DSubmitInput): Promise<Gen3DSubmitResult>;
  /** 轮询进度(0-100;终态带 glbUrl 或 errorCode) */
  poll(providerTaskId: string): Promise<Gen3DPollResult>;
}

/**
 * mock 供应商:按时长模拟进度爬坡;failRate 注入确定性失败(演练退款链路)。
 * 状态保存在进程内存(worker 单进程消费,重启后任务由 DB 状态机兜底恢复或超时退款)。
 */
export class MockGen3DProvider implements Gen3DProvider {
  readonly name = 'mock';
  private readonly tasks = new Map<string, { startedAt: number; fail: boolean }>();

  constructor(
    private readonly opts: { durationMs?: number; failRate?: number } = {}
  ) {}

  async submit(input: Gen3DSubmitInput): Promise<Gen3DSubmitResult> {
    const providerTaskId = `mock-${randomUUID()}`;
    this.tasks.set(providerTaskId, {
      startedAt: Date.now(),
      fail: Math.random() < (this.opts.failRate ?? 0)
    });
    void input;
    return { providerTaskId };
  }

  async poll(providerTaskId: string): Promise<Gen3DPollResult> {
    const task = this.tasks.get(providerTaskId);
    if (!task) {
      throw new Error(`mock provider: 未知任务 ${providerTaskId}(进程重启或任务不存在)`);
    }
    const duration = this.opts.durationMs ?? 4000;
    const elapsed = Date.now() - task.startedAt;

    if (task.fail && elapsed > duration * 0.5) {
      return { status: 'FAILED', progress: 60, errorCode: 'MOCK_INJECTED_FAILURE' };
    }
    if (elapsed >= duration) {
      return { status: 'COMPLETED', progress: 100, glbUrl: `mock://glb/${providerTaskId}` };
    }
    return { status: 'GENERATING', progress: Math.min(99, Math.floor((elapsed / duration) * 100)) };
  }
}

/** Meshy 适配器占位:PR-3 预研结论前明确拒绝(严禁编造 key 调真实接口) */
export class MeshyGen3DProvider implements Gen3DProvider {
  readonly name = 'meshy';

  async submit(): Promise<Gen3DSubmitResult> {
    throw new Error(
      env.MESHY_API_KEY
        ? 'Meshy 适配器待 PR-3 预研后实装(tech-stack §7.1)'
        : 'Meshy 未配置 MESHY_API_KEY(人工环节:账号付费档开通后注入环境变量)'
    );
  }

  async poll(): Promise<Gen3DPollResult> {
    throw new Error('Meshy 适配器待 PR-3 预研后实装');
  }
}

/** 供应商工厂:按 env.GEN3D_PROVIDER 装配(api 的 Nest provider 与 worker 的手动构造共用) */
export function createGen3DProvider(): Gen3DProvider {
  if (env.GEN3D_PROVIDER === 'meshy') {
    return new MeshyGen3DProvider();
  }
  return new MockGen3DProvider({
    durationMs: env.MOCK_GEN_DELAY_MS,
    failRate: env.MOCK_GEN_FAIL_RATE
  });
}
