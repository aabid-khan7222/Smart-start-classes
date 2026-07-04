import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function MobileLayout() {
  return (
    <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-slate-50 relative">
      <main className="px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
