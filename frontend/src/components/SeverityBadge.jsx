const colors = {
  INFO: 'bg-blue-900 text-blue-300',
  WARN: 'bg-amber-900 text-amber-300',
  ERROR: 'bg-red-900 text-red-300',
  CRITICAL: 'bg-purple-900 text-purple-300',
};

export default function SeverityBadge({ severity }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${colors[severity] || 'bg-gray-800 text-gray-400'}`}
    >
      {severity}
    </span>
  );
}
