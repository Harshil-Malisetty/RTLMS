import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SeverityBadge from '../components/SeverityBadge';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('OPEN');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'OPEN' ? '/alerts/open' : '/alerts/resolved';
      const res = await api.get(endpoint);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error('Fetch alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [tab]);

  const handleResolve = async (alert) => {
    try {
      await api.patch(`/alerts/${alert.alert_id}/resolve`, {
        log_id: String(alert.log_id),
        created_at: alert.created_at,
        alert_type: alert.alert_type,
      });
      toast.success('Alert resolved successfully');
      setAlerts(prev => prev.filter(a => String(a.alert_id) !== String(alert.alert_id)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve alert');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Alerts</h2>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {['OPEN', 'RESOLVED'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAlerts([]); }}
            className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
              tab === t
                ? 'text-primary border-primary'
                : 'text-muted border-transparent hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-surface border border-border">
        {loading ? (
          <p className="text-muted text-sm py-8 text-center">Loading...</p>
        ) : alerts.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">No {tab.toLowerCase()} alerts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Alert Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  {tab === 'OPEN' && user?.role !== 'VIEWER' && <th className="py-3 px-4">Action</th>}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={String(alert.alert_id)} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="py-2.5 px-4">
                      <SeverityBadge severity={alert.alert_type?.includes('CRITICAL') ? 'CRITICAL' : 'ERROR'} />
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs font-bold ${alert.status === 'OPEN' ? 'text-error' : 'text-success'}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted">
                      {String(alert.log_id).slice(0, 12)}…
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    {tab === 'OPEN' && user?.role !== 'VIEWER' && (
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => handleResolve(alert)}
                          className="text-xs text-success hover:text-success/80 font-bold transition-colors"
                        >
                          Resolve
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
