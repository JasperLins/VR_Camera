import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import { call } from '../api';

interface ReportRow {
  id: string;
  targetType: 'ANCHOR' | 'GEN_TASK' | 'USER';
  targetId: string;
  targetSummary: string | null;
  reason: 'COPYRIGHT' | 'ILLEGAL_CONTENT' | 'OTHER';
  note: string | null;
  status: 'RECEIVED' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  slaDeadline: string;
  slaBreached: boolean;
  resolution: string | null;
  createdAt: string;
}

interface PageData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: '已受理',
  REVIEWING: '复核中',
  RESOLVED: '已处置',
  DISMISSED: '已驳回'
};
const REASON_LABEL: Record<string, string> = { COPYRIGHT: '侵权', ILLEGAL_CONTENT: '违规内容', OTHER: '其他' };

// 职责:举报工单页——SLA 排序列表 + 受理→复核→处置流转(U-3,T21;48h SLA 预警)
export default function ReportsPage() {
  const [status, setStatus] = useState<string>('全部');
  const [data, setData] = useState<PageData<ReportRow>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [handling, setHandling] = useState<ReportRow | null>(null);
  const [resolution, setResolution] = useState('');

  const load = useCallback(
    async (page = 1, pageSize = 20) => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status !== '全部') {
          query.set('status', status);
        }
        setData(await call<PageData<ReportRow>>('GET', `/admin/reports?${query.toString()}`));
      } catch (err) {
        message.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    void load(1, data.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const transition = async (to: string) => {
    if (!handling) return;
    if ((to === 'RESOLVED' || to === 'DISMISSED') && !resolution.trim()) {
      message.warning('处置/驳回需填写结论');
      return;
    }
    try {
      await call('POST', `/admin/reports/${handling.id}/transition`, { to, resolution: resolution || undefined });
      message.success('工单已流转');
      setHandling(null);
      setResolution('');
      void load(data.page, data.pageSize);
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Typography.Title level={5} style={{ margin: 0 }}>
        举报工单({data.total} 条,按 SLA 截止排序)
      </Typography.Title>
      <Segmented
        options={['全部', '已受理', '复核中', '已处置', '已驳回']}
        value={status}
        onChange={(v) => setStatus(v as string)}
      />
      <Table<ReportRow>
        rowKey="id"
        loading={loading}
        dataSource={data.items}
        pagination={{
          total: data.total,
          pageSize: data.pageSize,
          current: data.page,
          showSizeChanger: false,
          onChange: (page, pageSize) => void load(page, pageSize)
        }}
        columns={[
          {
            title: '对象',
            dataIndex: 'targetSummary',
            ellipsis: true,
            render: (v: string | null, row) => v ?? `${row.targetType}:${row.targetId.slice(0, 8)}…`
          },
          { title: '理由', dataIndex: 'reason', width: 100, render: (v: string) => REASON_LABEL[v] },
          { title: '补充说明', dataIndex: 'note', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (v: string, row) => (
              <Space size={4}>
                <Tag>{STATUS_LABEL[v]}</Tag>
                {row.slaBreached && <Tag color="red">SLA 超时</Tag>}
              </Space>
            )
          },
          { title: 'SLA 截止', dataIndex: 'slaDeadline', width: 170, render: (v: string) => new Date(v).toLocaleString() },
          {
            title: '操作',
            width: 100,
            render: (_, row) =>
              row.status === 'RECEIVED' || row.status === 'REVIEWING' ? (
                <Button size="small" type="primary" onClick={() => setHandling(row)}>
                  处置
                </Button>
              ) : (
                <span>{row.resolution ?? '—'}</span>
              )
          }
        ]}
      />

      <Modal
        title={`工单处置(${handling ? STATUS_LABEL[handling.status] : ''})`}
        open={handling !== null}
        onCancel={() => setHandling(null)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {handling && (
            <>
              <Typography.Text type="secondary">{handling.targetSummary ?? handling.targetId}</Typography.Text>
              <Input.TextArea
                rows={3}
                placeholder="处置结论(必填)"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
              <Space>
                {handling.status === 'RECEIVED' && (
                  <Button onClick={() => void transition('REVIEWING')}>开始复核</Button>
                )}
                <Button type="primary" danger onClick={() => void transition('RESOLVED')}>
                  处置(下架等)
                </Button>
                <Button onClick={() => void transition('DISMISSED')}>驳回</Button>
              </Space>
            </>
          )}
        </Space>
      </Modal>
    </Space>
  );
}
