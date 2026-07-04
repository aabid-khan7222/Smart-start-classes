import { useSettings } from '../../hooks/useData';
import InstituteLogo from '../ui/InstituteLogo';

export default function Header() {
  const { settings } = useSettings();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <header className="pt-2 pb-1">
      <div className="flex items-center gap-3">
        <InstituteLogo size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{greeting}</p>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
            {settings.className || 'Smart Start Classes'}
          </h1>
        </div>
      </div>
    </header>
  );
}
