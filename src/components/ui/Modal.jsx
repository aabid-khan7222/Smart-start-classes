import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    lockBodyScroll();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      unlockBodyScroll();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/55 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[360px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 id="modal-title" className="text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
