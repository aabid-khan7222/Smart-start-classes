import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import Button from './ui/Button';
import { useSharedStore } from '../hooks/useSharedStore';

export default function SharedGate({ children }) {
  const { status, error, reload } = useSharedStore();

  if (status === 'ready') {
    return children;
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <Loader2 size={36} className="text-blue-600 animate-spin mb-4" />
        <h1 className="text-lg font-bold text-slate-900">Loading…</h1>
        <p className="text-sm text-slate-500 mt-2">
          Shared institute data load ho rahi hai.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <WifiOff size={28} />
      </div>
      <h1 className="text-lg font-bold text-slate-900">Server se connect nahi hua</h1>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        {error || 'Shared data load nahi ho payi. Server chal raha hai ya nahi check karo.'}
      </p>
      <Button className="mt-5" onClick={reload}>
        <RefreshCw size={16} />
        Try again
      </Button>
    </div>
  );
}
