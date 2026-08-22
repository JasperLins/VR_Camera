import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';
import ContentPage from './pages/ContentPage';
import ReportsPage from './pages/ReportsPage';
import Login from './pages/Login';
import { session } from './api';

// 职责:后台骨架——登录门卫 + 侧边栏双页(内容管理/举报工单,U-1~U-3)
function Guard({ children }: { children: React.ReactNode }) {
  if (!session.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Guard>
            <Layout style={{ minHeight: '100vh' }}>
              <Layout.Sider theme="dark" width={200}>
                <div style={{ color: '#fff', padding: 16, fontSize: 16, fontWeight: 600 }}>VR 留念后台</div>
                <Menu
                  theme="dark"
                  mode="inline"
                  defaultSelectedKeys={['content']}
                  items={[
                    { key: 'content', label: <Link to="/">内容管理</Link> },
                    { key: 'reports', label: <Link to="/reports">举报工单</Link> }
                  ]}
                />
              </Layout.Sider>
              <Layout>
                <Layout.Header style={{ background: '#fff', paddingInline: 24, fontSize: 14 }}>
                  强制下架与工单处置留痕(48h SLA);演示账号 deviceId: admin-demo-0001
                </Layout.Header>
                <Layout.Content style={{ padding: 24 }}>
                  <Routes>
                    <Route index element={<ContentPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                  </Routes>
                </Layout.Content>
              </Layout>
            </Layout>
          </Guard>
        }
      />
    </Routes>
  );
}
