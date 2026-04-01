import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ app_name: '', server_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/applications'), api.get('/servers')])
      .then(([aRes, sRes]) => {
        setApps(aRes.data.applications || []);
        setServers(sRes.data.servers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getServerHostname = (serverId) => {
    const s = servers.find(srv => String(srv.server_id) === String(serverId));
    return s ? s.hostname : String(serverId).slice(0, 8) + '…';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/applications', form);
      setApps(prev => [...prev, res.data.application]);
      setShowModal(false);
      setForm({ app_name: '', server_id: '' });
      toast.success('Application created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  const viewLogs = (appId) => {
    navigate('/logs', { state: { filterType: 'app', filterValue: String(appId) } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Applications</h2>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary/80 text-white text-sm px-4 py-2 font-bold transition-colors"
          >
            Add Application
          </button>
        )}
      </div>

      <div className="bg-surface border border-border">
        {loading ? (
          <p className="text-muted text-sm py-8 text-center">Loading...</p>
        ) : apps.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">No applications found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">App Name</th>
                  <th className="py-3 px-4">Linked Server</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={String(app.app_id)} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="py-2.5 px-4 font-bold">{app.app_name}</td>
                    <td className="py-2.5 px-4 text-muted">{getServerHostname(app.server_id)}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => viewLogs(app.app_id)}
                        className="text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                      >
                        View Logs →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Application Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Add Application</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">App Name</label>
                <input
                  type="text"
                  required
                  value={form.app_name}
                  onChange={(e) => setForm(f => ({ ...f, app_name: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Server</label>
                <select
                  required
                  value={form.server_id}
                  onChange={(e) => setForm(f => ({ ...f, server_id: e.target.value }))}
                  className="w-full bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary"
                >
                  <option value="">Select server</option>
                  {servers.map((s) => (
                    <option key={String(s.server_id)} value={String(s.server_id)}>
                      {s.hostname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary/80 text-white py-2 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-bg border border-border text-muted hover:text-white py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
