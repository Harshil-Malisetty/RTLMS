import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, Server, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/axios';
import useSocket from '../hooks/useSocket';
import StatCard from '../components/StatCard';
import LiveLogFeed from '../components/LiveLogFeed';
import SeverityBadge from '../components/SeverityBadge';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SEV_COLORS = { INFO: '#3b82f6', WARN: '#f59e0b', ERROR: '#ef4444', CRITICAL: '#a855f7' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/alerts/open?limit=5'),
      ]);
      setStats(statsRes.data);
      setRecentAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNewLog = useCallback((log) => {
    setLiveLogs(prev => [log, ...prev].slice(0, 50));
    // Refresh stats periodically on new logs
    if (Math.random() < 0.2) fetchData();
  }, [fetchData]);

  useSocket(handleNewLog);

  const handleResolve = async (alert) => {
    if (user?.role === 'VIEWER') return;
    try {
      await api.patch(`/alerts/${alert.alert_id}/resolve`, {
        log_id: String(alert.log_id),
        created_at: alert.created_at,
        alert_type: alert.alert_type,
      });
      toast.success('Alert resolved');
      setRecentAlerts(prev => prev.filter(a => String(a.alert_id) !== String(alert.alert_id)));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve alert');
    }
  };

  const chartData = stats?.severityDistribution
    ? Object.entries(stats.severityDistribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Dashboard</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Logs" value={stats?.totalLogs} icon={Activity} color="text-primary" />
        <StatCard label="Open Alerts" value={stats?.openAlerts} icon={AlertTriangle} color="text-error" />
        <StatCard label="Active Servers" value={stats?.activeServers} icon={Server} color="text-success" />
        <StatCard label="Critical (24h)" value={stats?.criticalLast24h} icon={Flame} color="text-critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution Chart */}
        <div className="bg-surface border border-border p-4">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Severity Distribution</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={SEV_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm text-center py-12">No data yet</p>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-surface border border-border p-4">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Recent Open Alerts</h3>
          {recentAlerts.length === 0 ? (
            <p className="text-muted text-sm text-center py-12">No open alerts</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={String(alert.alert_id)}
                  className="flex items-center justify-between bg-bg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={alert.alert_type?.includes('CRITICAL') ? 'CRITICAL' : 'ERROR'} />
                    <span className="text-xs text-muted font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  {user?.role !== 'VIEWER' && (
                    <button
                      onClick={() => handleResolve(alert)}
                      className="text-xs text-success hover:text-success/80 font-bold transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Log Feed */}
      <div>
        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Live Log Feed</h3>
        <LiveLogFeed logs={liveLogs} />
      </div>
    </div>
  );
}
