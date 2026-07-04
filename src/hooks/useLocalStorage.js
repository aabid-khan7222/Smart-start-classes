import { useState, useEffect, useCallback } from 'react';

function readStoredValue(key, initialValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  } catch {
    return initialValue;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or private mode errors
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStoredValue(key, initialValue));

  const update = useCallback((newValue) => {
    setValue((prev) => {
      const next = typeof newValue === 'function' ? newValue(prev) : newValue;
      writeStoredValue(key, next);
      return next;
    });
  }, [key]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== key || event.newValue == null) return;
      try {
        setValue(JSON.parse(event.newValue));
      } catch {
        // Ignore invalid JSON from other tabs
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, update];
}
