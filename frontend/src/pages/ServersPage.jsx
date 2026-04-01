import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ServersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ hostname: '', ip_address: '', location: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/servers')
      .then(res => setServers(res.data.servers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/servers', form);
      setServers(prev => [...prev, res.data.server]);
      setShowModal(false);
      setForm({ hostname: '', ip_address: '', location: '' });
      toast.success('Server created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create server');
    } finally {
      setSubmitting(false);
    }
  };

  const viewLogs = (serverId) => {
    navigate('/logs', { state: { filterType: 'server', filterValue: String(serverId) } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Servers</h2>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary/80 text-white text-sm px-4 py-2 font-bold transition-colors"
          >
            Add Server
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((s) => (
            <div key={String(s.server_id)} className="bg-surface border border-border p-4 space-y-2">
              <h3 className="font-bold text-white">{s.hostname}</h3>
              <p className="text-xs text-muted font-mono">{s.ip_address}</p>
              <p className="text-xs text-muted">{s.location}</p>
              <button
                onClick={() => viewLogs(s.server_id)}
                className="text-xs text-primary hover:text-primary/80 font-bold transition-colors"
              >
                View Logs →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Server Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Add Server</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Hostname</label>
                <input
                  type="text"
                  required
                  value={form.hostname}
                  onChange={(e) => setForm(f => ({ ...f, hostname: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">IP Address</label>
                <input
                  type="text"
                  required
                  value={form.ip_address}
                  onChange={(e) => setForm(f => ({ ...f, ip_address: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
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
