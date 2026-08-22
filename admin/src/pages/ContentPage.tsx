import { useCallback, useEffect, useState } from 'react';
import { Button, Popconfirm, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import { call } from '../api';

interface AnchorRow {
  id: string;
  title: string;
  userId: string;
  contentType: 'MODEL' | 'IMAGE' | 'TEXT';
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'VISIBLE' | 'HIDDEN' | 'DELETED';
  aiGenerated: boolean;
  latitude: string;
  longitude: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

interface PageData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<string, string> = { VISIBLE: '可见', HIDDEN: '已隐藏', DELETED: '已删除' };

// 职责:内容管理页——全量锚点列表 + 状态过滤 + 强制下架(U-1/U-2,T21)
export default function ContentPage() {
  const [status, setStatus] = useState<string>('全部');
  const [data, setData] = useState<PageData<AnchorRow>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (page = 1, pageSize = 20) => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status !== '全部') {
          query.set('status', status);
        }
        setData(await call<PageData<AnchorRow>>('GET', `/admin/anchors?${query.toString()}`));
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

  const takedown = async (id: string) => {
    try {
      await call('POST', `/admin/anchors/${id}/takedown`);
      message.success('已强制下架(转 HIDDEN)');
      void load(data.page, data.pageSize);
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Typography.Title level={5} style={{ margin: 0 }}>
        内容管理({data.total} 条)
      </Typography.Title>
      <Segmented
        options={['全部', '可见', '已隐藏', '已删除']}
        value={status}
        onChange={(v) => setStatus(v as string)}
      />
      <Table<AnchorRow>
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
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '类型', dataIndex: 'contentType', width: 80 },
          {
            title: '可见性',
            dataIndex: 'visibility',
            width: 90,
            render: (v: string) => (v === 'PRIVATE' ? <Tag color="purple">私密</Tag> : <Tag>公开</Tag>)
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (v: string) =>
              v === 'VISIBLE' ? <Tag color="green">{STATUS_LABEL[v]}</Tag> : <Tag color="orange">{STATUS_LABEL[v]}</Tag>
          },
          {
            title: 'AI 标识',
            dataIndex: 'aiGenerated',
            width: 90,
            render: (v: boolean) => (v ? <Tag color="blue">AI 生成</Tag> : <span>—</span>)
          },
          { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString() },
          {
            title: '操作',
            width: 130,
            render: (_, row) =>
              row.status === 'VISIBLE' ? (
                <Popconfirm title="确认强制下架该内容?" onConfirm={() => void takedown(row.id)}>
                  <Button danger size="small">
                    强制下架
                  </Button>
                </Popconfirm>
              ) : (
                <span>—</span>
              )
          }
        ]}
      />
    </Space>
  );
}
