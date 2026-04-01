import SeverityBadge from './SeverityBadge';

export default function LogTable({ logs, showServer = true, showApp = true }) {
  if (!logs || logs.length === 0) {
    return <p className="text-muted text-sm py-8 text-center">No logs found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wider">
            <th className="py-3 px-4">Timestamp</th>
            {showServer && <th className="py-3 px-4">Server</th>}
            {showApp && <th className="py-3 px-4">App</th>}
            <th className="py-3 px-4">Severity</th>
            <th className="py-3 px-4">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.log_id || i} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
              <td className="py-2.5 px-4 font-mono text-xs text-muted whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              {showServer && (
                <td className="py-2.5 px-4 text-xs">
                  {log.server_id ? String(log.server_id).slice(0, 8) + '…' : '—'}
                </td>
              )}
              {showApp && (
                <td className="py-2.5 px-4 text-xs">
                  {log.app_id ? String(log.app_id).slice(0, 8) + '…' : '—'}
                </td>
              )}
              <td className="py-2.5 px-4">
                <SeverityBadge severity={log.severity} />
              </td>
              <td className="py-2.5 px-4 font-mono text-xs max-w-md truncate">
                {log.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
