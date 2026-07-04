import { STORAGE_KEYS } from './constants';
import { defaultSettings } from '../data/defaults';

export function getFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getStudents() {
  return getFromStorage(STORAGE_KEYS.STUDENTS, []);
}

export function saveStudents(students) {
  saveToStorage(STORAGE_KEYS.STUDENTS, students);
}

export function getAttendance() {
  return getFromStorage(STORAGE_KEYS.ATTENDANCE, []);
}

export function saveAttendance(attendance) {
  saveToStorage(STORAGE_KEYS.ATTENDANCE, attendance);
}

export function getFeePayments() {
  return getFromStorage(STORAGE_KEYS.FEE_PAYMENTS, []);
}

export function saveFeePayments(payments) {
  saveToStorage(STORAGE_KEYS.FEE_PAYMENTS, payments);
}

export function getSettings() {
  return getFromStorage(STORAGE_KEYS.SETTINGS, defaultSettings);
}

export function saveSettings(settings) {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

export function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    students: getStudents(),
    attendance: getAttendance(),
    feePayments: getFeePayments(),
    settings: getSettings(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importBackup(jsonString) {
  const backup = JSON.parse(jsonString);
  if (!backup.students || !backup.attendance || !backup.feePayments) {
    throw new Error('Invalid backup file format');
  }
  saveStudents(backup.students);
  saveAttendance(backup.attendance);
  saveFeePayments(backup.feePayments);
  if (backup.settings) saveSettings(backup.settings);
  return backup;
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
