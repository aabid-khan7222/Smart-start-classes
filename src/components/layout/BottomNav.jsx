import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  CalendarCheck,
  BarChart3,
  Settings,
} from 'lucide-react';
import { NAV_ITEMS } from '../../utils/constants';

const iconMap = {
  LayoutDashboard,
  Users,
  IndianRupee,
  CalendarCheck,
  BarChart3,
  Settings,
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 safe-bottom">
      <div className="mx-3 mb-3 bg-white border border-slate-200/80 rounded-2xl shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-around px-1 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[52px] ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
