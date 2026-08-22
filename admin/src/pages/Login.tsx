import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { call, session } from '../api';

interface LoginResult {
  token: string;
  user: { id: string; nickname: string | null; role: 'USER' | 'ADMIN' };
}

// 职责:后台登录——deviceId 走游客登录(复用服务端 JWT),role=ADMIN 放行(RBAC,U-1)
export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { deviceId: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await call<LoginResult>('POST', '/auth/guest', { deviceId: values.deviceId });
      if (data.user.role !== 'ADMIN') {
        setError('该账号无管理员权限(role=USER 被拒)');
        return;
      }
      session.setToken(data.token);
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={4} style={{ textAlign: 'center' }}>
          VR 留念 · 管理后台
        </Typography.Title>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} initialValues={{ deviceId: 'admin-demo-0001' }}>
          <Form.Item
            name="deviceId"
            label="管理员 deviceId"
            rules={[{ required: true, min: 8, message: 'deviceId 至少 8 位' }]}
          >
            <Input placeholder="admin-demo-0001" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录(RBAC 校验)
          </Button>
        </Form>
      </Card>
    </div>
  );
}
