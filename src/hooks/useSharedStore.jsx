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
const POLL_MS = 4000;

export function SharedStoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const storeRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const flushSave = useCallback(async (snapshot) => {
    savingRef.current = true;
    try {
      const saved = await saveStore(snapshot);
      storeRef.current = saved;
      setStore(saved);
      setError('');
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

      if (savingRef.current) {
        pendingRef.current = snapshot;
        return snapshot;
      }

      flushSave(snapshot);
      return snapshot;
    },
    [flushSave]
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

  // Keep other phones in sync by polling (no database / websocket needed)
  useEffect(() => {
    if (status !== 'ready') return undefined;

    const timer = setInterval(async () => {
      if (savingRef.current || pendingRef.current) return;
      try {
        const remote = await fetchStore();
        const local = storeRef.current;
        if (!local) return;

        const remoteTime = new Date(remote.updatedAt || 0).getTime();
        const localTime = new Date(local.updatedAt || 0).getTime();
        if (remoteTime > localTime) {
          storeRef.current = remote;
          setStore(remote);
        }
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
