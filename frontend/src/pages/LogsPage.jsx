import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import LogTable from '../components/LogTable';

export default function LogsPage() {
  const location = useLocation();
  const [servers, setServers] = useState([]);
  const [apps, setApps] = useState([]);
  const [filterType, setFilterType] = useState(location.state?.filterType || 'severity');
  const [filterValue, setFilterValue] = useState(location.state?.filterValue || '');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/servers'), api.get('/applications')])
      .then(([sRes, aRes]) => {
        setServers(sRes.data.servers || []);
        setApps(aRes.data.applications || []);
      })
      .catch(console.error);
  }, []);

  const fetchLogs = async (append = false) => {
    if (!filterValue) return;
    setLoading(true);
    try {
      let url = '';
      if (filterType === 'severity') {
        url = `/logs/by-severity/${filterValue}`;
      } else if (filterType === 'server') {
        url = `/logs/by-server/${filterValue}`;
      } else if (filterType === 'app') {
        url = `/logs/by-app/${filterValue}`;
      }

      const params = { limit: 50 };
      if (append && pageState) params.pageState = pageState;

      const res = await api.get(url, { params });
      const newLogs = res.data.logs || [];

      if (append) {
        setLogs(prev => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }
      setPageState(res.data.nextPageState);
      setHasMore(!!res.data.nextPageState);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterValue) {
      setPageState(null);
      fetchLogs(false);
    } else {
      setLogs([]);
    }
  }, [filterType, filterValue]);

  // Set default filter value when type changes
  const handleTypeChange = (type) => {
    setFilterType(type);
    setFilterValue('');
    setLogs([]);
    setPageState(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Logs</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-surface border border-border p-4">
        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">Filter By</label>
          <select
            value={filterType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="severity">Severity</option>
            <option value="server">Server</option>
            <option value="app">Application</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted uppercase tracking-wider mb-1">
            {filterType === 'severity' ? 'Severity Level' : filterType === 'server' ? 'Server' : 'Application'}
          </label>
          {filterType === 'severity' ? (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">Select severity</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          ) : filterType === 'server' ? (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">Select server</option>
              {servers.map((s) => (
                <option key={String(s.server_id)} value={String(s.server_id)}>
                  {s.hostname} ({s.ip_address})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">Select application</option>
              {apps.map((a) => (
                <option key={String(a.app_id)} value={String(a.app_id)}>
                  {a.app_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-surface border border-border">
        {loading && logs.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">Loading...</p>
        ) : (
          <>
            <LogTable logs={logs} />
            {hasMore && (
              <div className="p-4 text-center border-t border-border">
                <button
                  onClick={() => fetchLogs(true)}
                  disabled={loading}
                  className="text-sm text-primary hover:text-primary/80 font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
