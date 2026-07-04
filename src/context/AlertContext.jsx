import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AlertDialog from '../components/ui/AlertDialog';

const AlertContext = createContext(null);

const DEFAULTS = {
  success: { title: 'Success!', confirmText: 'OK' },
  error: { title: 'Error', confirmText: 'OK' },
  confirm: {
    title: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
  },
};

function normalizeAlert(type, options = {}) {
  const base = DEFAULTS[type] || {};
  return {
    type: options.type || base.type || type,
    title: options.title ?? base.title,
    text: options.text ?? options.message ?? '',
    confirmText: options.confirmText ?? base.confirmText ?? 'OK',
    cancelText: options.cancelText ?? base.cancelText ?? 'Cancel',
    autoCloseMs: options.autoCloseMs ?? 0,
  };
}

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const resolveRef = useRef(null);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closeAlert = useCallback(
    (result = false) => {
      clearTimer();
      setAlert(null);
      if (resolveRef.current) {
        resolveRef.current(result);
        resolveRef.current = null;
      }
    },
    [clearTimer]
  );

  const openAlert = useCallback(
    (kind, options = {}) => {
      clearTimer();
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        const config = normalizeAlert(kind, options);
        setAlert({ ...config, kind, showCancel: kind === 'confirm' });

        if (kind !== 'confirm' && config.autoCloseMs > 0) {
          timerRef.current = setTimeout(() => closeAlert(true), config.autoCloseMs);
        }
      });
    },
    [clearTimer, closeAlert]
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const showSuccess = useCallback(
    (options) => openAlert('success', { type: 'success', ...options }),
    [openAlert]
  );

  const showError = useCallback(
    (options) => openAlert('error', { type: 'error', ...options }),
    [openAlert]
  );

  const showConfirm = useCallback(
    (options) => openAlert('confirm', { type: 'warning', ...options }),
    [openAlert]
  );

  const handleConfirm = () => closeAlert(true);
  const handleCancel = () => closeAlert(false);

  return (
    <AlertContext.Provider value={{ showSuccess, showError, showConfirm }}>
      {children}
      <AlertDialog
        isOpen={Boolean(alert)}
        type={alert?.type}
        title={alert?.title}
        text={alert?.text}
        confirmText={alert?.confirmText}
        cancelText={alert?.cancelText}
        showCancel={alert?.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return ctx;
}
