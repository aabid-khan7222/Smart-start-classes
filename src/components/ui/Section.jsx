import Card from './Card';
import InstituteLogo from './InstituteLogo';

export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export function ListItem({ avatar, title, subtitle, right, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 py-3 ${onClick ? 'active:bg-slate-50 cursor-pointer -mx-1 px-1 rounded-xl' : ''}`}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const initials = name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' };

  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0`}>
      {initials}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, showLogo = true }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {showLogo && <InstituteLogo size="md" className="mt-0.5" />}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function ChartCard({ title, children }) {
  return (
    <Card className="animate-fade-in">
      <h3 className="text-sm font-bold text-slate-800 mb-4">{title}</h3>
      {children}
    </Card>
  );
}
