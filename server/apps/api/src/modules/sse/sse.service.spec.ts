/**
 * 职责:SSE 服务单测——频道名规范与消息转发(内存 Redis 替身)(PKG-08 L-6)
 */
import { taskChannel } from './sse.service';

describe('taskChannel', () => {
  it('任务进度频道带 vrm 前缀,与 worker 发布侧共用同一定义', () => {
    expect(taskChannel('t-1')).toBe('vrm:task:t-1');
  });

  it('不同任务不串流', () => {
    expect(taskChannel('a')).not.toBe(taskChannel('b'));
  });
});
