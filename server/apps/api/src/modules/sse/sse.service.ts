/**
 * 职责:SSE 流服务——Redis pub/sub → 客户端事件流的桥(worker 发布进度,API 推送,B2 生成任务接入)
 * 关联需求:FR-04(生成进度);关联任务:PKG-08(L-6,SSE 优先/轮询兜底)
 * 说明:订阅用独立连接(订阅模式下不能执行普通命令),与共享 REDIS_CLIENT 分离
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import { env, taskChannel } from '@vrm/shared';
import Redis from 'ioredis';

export interface SseMessage {
  data: unknown;
  id?: string;
  type?: string;
}

export { taskChannel };

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private readonly connections = new Set<Redis>();

  /** 订阅频道并转为 Observable;客户端断开(onClose)或取消订阅时清理连接 */
  stream(channel: string, onClose: () => void): Observable<SseMessage> {
    return new Observable<SseMessage>((subscriber) => {
      const sub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
      this.connections.add(sub);
      sub.on('error', (err) => this.logger.warn(`sse redis: ${err.message}`));

      void sub.subscribe(channel).catch((err: Error) => {
        subscriber.error(BizInternal(`SSE 订阅失败: ${err.message}`));
      });

      sub.on('message', (_channel: string, payload: string) => {
        subscriber.next({ data: safeParse(payload) });
      });

      const cleanup = () => {
        onClose();
        this.connections.delete(sub);
        void sub.disconnect();
      };
      subscriber.add(cleanup);
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.connections) {
      void sub.disconnect();
    }
    this.connections.clear();
  }
}

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function BizInternal(message: string): Error {
  // SSE 流内错误不做 HTTP 信封包装,仅终止流;进度语义错误由 data 承载
  return new Error(message);
}
