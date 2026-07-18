import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createEmptyStore,
  loadStoreWithMigration,
  saveStore,
  fetchStore,
} from '../lib/apiStore';

const SharedStoreContext = createContext(null);
const POLL_MS = 12000;
const SAVE_DEBOUNCE_MS = 400;
const WRITE_COOLDOWN_MS = 2500;

function storeContentKey(store) {
  if (!store) return '';
  // Avoid full JSON of logo-heavy settings on every compare
  return [
    store.updatedAt,
    store.students?.length ?? 0,
    store.attendance?.length ?? 0,
    store.fee_payments?.length ?? 0,
    store.settings?.className ?? '',
    store.settings?.logo?.length ?? 0,
    store.auth?.username ?? '',
  ].join('|');
}

export function SharedStoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const storeRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastWriteAtRef = useRef(0);
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const flushSave = useCallback(async (snapshot) => {
    savingRef.current = true;
    lastWriteAtRef.current = Date.now();
    try {
      const saved = await saveStore(snapshot);
      // Keep ref in sync with server timestamp, but do NOT re-render —
      // UI already has optimistic data. Re-render here freezes mobile scroll.
      storeRef.current = saved;
      lastWriteAtRef.current = Date.now();
      setError((prev) => (prev ? '' : prev));
    } catch (err) {
      console.error('Shared save failed:', err);
      setError(err?.message || 'Failed to save shared data');
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        flushSave(next);
      }
    }
  }, []);

  const queueSave = useCallback(
    (snapshot) => {
      pendingRef.current = snapshot;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const next = pendingRef.current;
        pendingRef.current = null;
        saveTimerRef.current = null;
        if (!next) return;
        if (savingRef.current) {
          pendingRef.current = next;
          return;
        }
        flushSave(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave]
  );

  const persist = useCallback(
    (updater) => {
      const current = storeRef.current || createEmptyStore();
      const next =
        typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      const snapshot = {
        ...next,
        updatedAt: new Date().toISOString(),
      };

      storeRef.current = snapshot;
      setStore(snapshot);
      lastWriteAtRef.current = Date.now();
      queueSave(snapshot);
      return snapshot;
    },
    [queueSave]
  );

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const loaded = await loadStoreWithMigration();
      storeRef.current = loaded;
      setStore(loaded);
      setStatus('ready');
    } catch (err) {
      console.error('Shared load failed:', err);
      setError(err?.message || 'Failed to load shared data');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Pause polling while the user is actively scrolling (prevents freeze)
  useEffect(() => {
    const markScrolling = () => {
      scrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        scrollingRef.current = false;
      }, 800);
    };

    window.addEventListener('scroll', markScrolling, { passive: true });
    window.addEventListener('touchmove', markScrolling, { passive: true });
    return () => {
      window.removeEventListener('scroll', markScrolling);
      window.removeEventListener('touchmove', markScrolling);
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return undefined;

    const timer = setInterval(async () => {
      if (document.hidden) return;
      if (savingRef.current || pendingRef.current || saveTimerRef.current) return;
      if (scrollingRef.current) return;
      if (Date.now() - lastWriteAtRef.current < WRITE_COOLDOWN_MS) return;

      try {
        const remote = await fetchStore();
        const local = storeRef.current;
        if (!local) return;

        const remoteTime = new Date(remote.updatedAt || 0).getTime();
        const localTime = new Date(local.updatedAt || 0).getTime();
        if (remoteTime <= localTime) return;

        // Ignore no-op / echo updates that would still re-render the whole app
        if (storeContentKey(remote) === storeContentKey(local) && remoteTime - localTime < 5000) {
          storeRef.current = remote;
          return;
        }

        storeRef.current = remote;
        setStore(remote);
      } catch {
        // Ignore transient network errors while polling
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [status]);

  const value = useMemo(
    () => ({
      store: store || createEmptyStore(),
      persist,
      status,
      error,
      reload,
      isReady: status === 'ready',
    }),
    [store, persist, status, error, reload]
  );

  return (
    <SharedStoreContext.Provider value={value}>{children}</SharedStoreContext.Provider>
  );
}

export function useSharedStore() {
  const ctx = useContext(SharedStoreContext);
  if (!ctx) throw new Error('useSharedStore must be used within SharedStoreProvider');
  return ctx;
}
