export default function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
    purple: { bg: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', ring: 'ring-slate-100' },
  };

  const c = colors[color] || colors.blue;

  return (
    <div
      className="animate-fade-in bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
            <Icon size={20} className={c.icon} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
