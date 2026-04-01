import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogsPage from './pages/LogsPage';
import AlertsPage from './pages/AlertsPage';
import ServersPage from './pages/ServersPage';
import ApplicationsPage from './pages/ApplicationsPage';
import AuditPage from './pages/AuditPage';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-bg text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="servers" element={<ServersPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route
          path="audit"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AuditPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
