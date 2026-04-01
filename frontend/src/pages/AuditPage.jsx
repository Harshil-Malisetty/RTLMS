import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AuditPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/audit/users')
      .then(res => setUsers(res.data.users || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setAudits([]);
      return;
    }
    setLoading(true);
    api.get(`/audit/by-user/${selectedUser}`)
      .then(res => setAudits(res.data.audits || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedUser]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Audit Trail</h2>

      <div className="bg-surface border border-border p-4">
        <label className="block text-xs text-muted uppercase tracking-wider mb-1">Select User</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="bg-bg border border-border text-white text-sm px-3 py-2 focus:outline-none focus:border-primary min-w-[260px]"
        >
          <option value="">Choose a user...</option>
          {users.map((u) => (
            <option key={String(u.user_id)} value={String(u.user_id)}>
              {u.name} ({u.role}) — {u.email}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border">
        {!selectedUser ? (
          <p className="text-muted text-sm py-8 text-center">Select a user to view their audit trail.</p>
        ) : loading ? (
          <p className="text-muted text-sm py-8 text-center">Loading...</p>
        ) : audits.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">No audit entries found for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a, i) => (
                  <tr key={String(a.audit_id) || i} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="py-2.5 px-4 font-mono text-xs text-muted whitespace-nowrap">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">{a.action}</td>
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
