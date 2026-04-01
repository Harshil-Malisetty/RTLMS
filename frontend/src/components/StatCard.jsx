export default function StatCard({ label, value, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="bg-surface border border-border p-4 flex items-center gap-4">
      {Icon && (
        <div className={`p-2 rounded bg-bg ${color}`}>
          <Icon size={22} />
        </div>
      )}
      <div>
        <p className="text-muted text-xs uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      </div>
    </div>
  );
}
