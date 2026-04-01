import { useRef, useEffect } from 'react';
import SeverityBadge from './SeverityBadge';

export default function LiveLogFeed({ logs }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="bg-bg border border-border rounded overflow-y-auto max-h-80 font-mono text-xs"
    >
      {(!logs || logs.length === 0) ? (
        <div className="p-4 text-muted text-center">Waiting for live logs...</div>
      ) : (
        logs.map((log, i) => (
          <div
            key={log.log_id || i}
            className="flex items-start gap-3 px-3 py-1.5 border-b border-border/30 hover:bg-surface/30"
          >
            <span className="text-muted whitespace-nowrap shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <SeverityBadge severity={log.severity} />
            <span className="text-muted truncate">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
