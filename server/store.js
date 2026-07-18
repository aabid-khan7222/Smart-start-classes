import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const storePath = path.join(dataDir, 'store.json');

const defaultStore = {
  students: [],
  attendance: [],
  fee_payments: [],
  settings: {
    className: 'Smart Start Classes',
    contact: '',
    address: '',
    logo: '',
  },
  auth: {
    username: 'alfiya-shaikh',
    email: 'alfiya@gmail.com',
    password: 'alfiya@7222',
  },
  updatedAt: new Date().toISOString(),
};

function ensureStoreFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

export function readStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore,
      ...parsed,
      settings: { ...defaultStore.settings, ...(parsed.settings || {}) },
      auth: { ...defaultStore.auth, ...(parsed.auth || {}) },
      students: Array.isArray(parsed.students) ? parsed.students : [],
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      fee_payments: Array.isArray(parsed.fee_payments) ? parsed.fee_payments : [],
    };
  } catch {
    return { ...defaultStore, updatedAt: new Date().toISOString() };
  }
}

export function writeStore(next) {
  ensureStoreFile();
  const payload = {
    students: Array.isArray(next.students) ? next.students : [],
    attendance: Array.isArray(next.attendance) ? next.attendance : [],
    fee_payments: Array.isArray(next.fee_payments) ? next.fee_payments : [],
    settings: { ...defaultStore.settings, ...(next.settings || {}) },
    auth: { ...defaultStore.auth, ...(next.auth || {}) },
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(storePath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}
