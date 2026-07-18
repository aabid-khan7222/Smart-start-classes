import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import Button from './Button';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

const ICONS = {
  success: {
    Icon: CheckCircle2,
    ring: 'bg-emerald-100',
    color: 'text-emerald-600',
  },
  error: {
    Icon: XCircle,
    ring: 'bg-red-100',
    color: 'text-red-600',
  },
  warning: {
    Icon: AlertTriangle,
    ring: 'bg-amber-100',
    color: 'text-amber-600',
  },
  info: {
    Icon: Info,
    ring: 'bg-blue-100',
    color: 'text-blue-600',
  },
};

export default function AlertDialog({
  isOpen,
  type = 'success',
  title,
  text,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    lockBodyScroll();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && showCancel) {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      unlockBodyScroll();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, showCancel, onCancel]);

  if (!isOpen) return null;

  const { Icon, ring, color } = ICONS[type] || ICONS.info;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/55 animate-fade-in"
        onClick={showCancel ? onCancel : undefined}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[340px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] animate-scale-in overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center">
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${ring}`}
          >
            <Icon size={34} className={color} strokeWidth={2} />
          </div>
          <h3 id="alert-title" className="text-lg font-bold text-slate-900 leading-snug">
            {title}
          </h3>
          {text && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{text}</p>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          {showCancel && (
            <Button variant="outline" fullWidth onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button
            fullWidth
            variant="primary"
            onClick={onConfirm}
            className={
              showCancel
                ? 'bg-red-600 text-white border-transparent shadow-lg shadow-red-600/25 active:bg-red-700'
                : type === 'success'
                  ? 'bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-600/25 active:bg-emerald-700'
                  : type === 'error'
                    ? 'bg-red-600 text-white border-transparent shadow-lg shadow-red-600/25 active:bg-red-700'
                    : ''
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
