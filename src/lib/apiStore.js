import { defaultSettings, defaultAuthCredentials } from '../data/defaults';
import { getFromStorage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

const MIGRATION_FLAG = 'smartstart_api_migrated';

export function createEmptyStore() {
  return {
    students: [],
    attendance: [],
    holidays: [],
    fee_payments: [],
    settings: { ...defaultSettings },
    auth: { ...defaultAuthCredentials },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeStore(data) {
  const empty = createEmptyStore();
  if (!data) return empty;
  return {
    students: Array.isArray(data.students) ? data.students : empty.students,
    attendance: Array.isArray(data.attendance) ? data.attendance : empty.attendance,
    holidays: Array.isArray(data.holidays) ? data.holidays : empty.holidays,
    fee_payments: Array.isArray(data.fee_payments) ? data.fee_payments : empty.fee_payments,
    settings: { ...defaultSettings, ...(data.settings || {}) },
    auth: { ...defaultAuthCredentials, ...(data.auth || {}) },
    updatedAt: data.updatedAt || empty.updatedAt,
  };
}

function readLocalCandidate() {
  const students = getFromStorage(STORAGE_KEYS.STUDENTS, []);
  const attendance = getFromStorage(STORAGE_KEYS.ATTENDANCE, []);
  const feePayments = getFromStorage(STORAGE_KEYS.FEE_PAYMENTS, []);
  const settings = getFromStorage(STORAGE_KEYS.SETTINGS, null);
  const auth = getFromStorage(STORAGE_KEYS.AUTH, null);

  const hasLocal =
    students.length > 0 ||
    attendance.length > 0 ||
    feePayments.length > 0 ||
    Boolean(settings) ||
    Boolean(auth);

  if (!hasLocal) return null;

  return normalizeStore({
    students,
    attendance,
    fee_payments: feePayments,
    settings: settings || defaultSettings,
    auth: auth || defaultAuthCredentials,
  });
}

export async function fetchStore() {
  const res = await fetch('/api/store');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to load shared data');
  }
  return normalizeStore(await res.json());
}

export async function saveStore(store) {
  const res = await fetch('/api/store', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to save shared data');
  }
  return normalizeStore(await res.json());
}

export async function loadStoreWithMigration() {
  const remote = await fetchStore();
  const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG) === '1';
  const local = !alreadyMigrated ? readLocalCandidate() : null;

  const remoteEmpty =
    remote.students.length === 0 &&
    remote.attendance.length === 0 &&
    remote.fee_payments.length === 0;

  if (remoteEmpty && local) {
    const saved = await saveStore(local);
    localStorage.setItem(MIGRATION_FLAG, '1');
    return saved;
  }

  localStorage.setItem(MIGRATION_FLAG, '1');
  return remote;
}
