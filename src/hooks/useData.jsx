import { createContext, useContext } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS, ATTENDANCE_STATUS } from '../utils/constants';
import { generateId } from '../utils/storage';
import { defaultSettings } from '../data/defaults';
import { validatePaymentAmount } from '../utils/feeHelpers';
import { normalizeDate } from '../utils/dateHelpers';
import {
  normalizeAttendanceStatus,
  isSameStudentId,
} from '../utils/attendanceHelpers';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [students, setStudents] = useLocalStorage(STORAGE_KEYS.STUDENTS, []);
  const [attendance, setAttendance] = useLocalStorage(STORAGE_KEYS.ATTENDANCE, []);
  const [payments, setPayments] = useLocalStorage(STORAGE_KEYS.FEE_PAYMENTS, []);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, defaultSettings);

  const addStudent = (data) => {
    const student = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setStudents((prev) => [student, ...prev]);
    return student;
  };

  const updateStudent = (id, data) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteStudent = (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const getStudent = (id) => students.find((s) => s.id === id);

  const markAttendance = (studentId, date, status, reason = '') => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate || !studentId) return false;

    const normalizedStatus = normalizeAttendanceStatus(status);
    if (!normalizedStatus) return false;

    setAttendance((prev) => {
      const existingIdx = prev.findIndex(
        (a) =>
          isSameStudentId(a.studentId, studentId) &&
          normalizeDate(a.date) === normalizedDate
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const record = { ...updated[existingIdx], status: normalizedStatus };
        if (normalizedStatus === ATTENDANCE_STATUS.ABSENT) {
          record.reason = reason || '';
        } else {
          delete record.reason;
        }
        updated[existingIdx] = record;
        return updated;
      }

      const record = {
        id: generateId(),
        studentId: String(studentId),
        date: normalizedDate,
        status: normalizedStatus,
      };
      if (normalizedStatus === ATTENDANCE_STATUS.ABSENT) {
        record.reason = reason || '';
      }
      return [...prev, record];
    });

    return true;
  };

  const saveBulkAttendance = (records, date) => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate || !records?.length) return false;

    const normalizedRecords = records
      .map((r) => ({
        studentId: String(r.studentId),
        status: normalizeAttendanceStatus(r.status),
        reason: r.reason || '',
      }))
      .filter((r) => r.studentId && r.status);

    if (!normalizedRecords.length) return false;

    setAttendance((prev) => {
      const updatedStudentIds = new Set(normalizedRecords.map((r) => r.studentId));

      const kept = prev.filter(
        (a) =>
          !(
            normalizeDate(a.date) === normalizedDate &&
            updatedStudentIds.has(String(a.studentId))
          )
      );

      const newRecords = normalizedRecords.map((r) => {
        const existing = prev.find(
          (a) =>
            isSameStudentId(a.studentId, r.studentId) &&
            normalizeDate(a.date) === normalizedDate
        );

        const record = {
          id: existing?.id ?? generateId(),
          studentId: r.studentId,
          date: normalizedDate,
          status: r.status,
        };

        if (r.status === ATTENDANCE_STATUS.ABSENT) {
          record.reason = r.reason || '';
        }

        return record;
      });

      return [...kept, ...newRecords];
    });

    return true;
  };

  const addPayment = (data) => {
    const student = students.find((s) => s.id === data.studentId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    let addedPayment = null;
    let validationError = null;

    setPayments((prev) => {
      const validation = validatePaymentAmount(
        student,
        data.paymentMonth,
        data.amountPaid,
        prev
      );

      if (!validation.valid) {
        validationError = validation.error;
        return prev;
      }

      addedPayment = {
        ...data,
        amountPaid: validation.amount,
        id: generateId(),
      };
      return [addedPayment, ...prev];
    });

    if (validationError) {
      return { success: false, error: validationError };
    }

    return { success: true, payment: addedPayment };
  };

  const deletePayment = (id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const updateSettings = (data) => {
    setSettings((prev) => ({ ...defaultSettings, ...prev, ...data }));
  };

  const value = {
    students,
    setStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    attendance,
    setAttendance,
    markAttendance,
    saveBulkAttendance,
    payments,
    setPayments,
    addPayment,
    deletePayment,
    settings,
    setSettings,
    updateSettings,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useStudents() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useStudents must be used within DataProvider');
  return {
    students: ctx.students,
    addStudent: ctx.addStudent,
    updateStudent: ctx.updateStudent,
    deleteStudent: ctx.deleteStudent,
    getStudent: ctx.getStudent,
    setStudents: ctx.setStudents,
  };
}

export function useAttendance() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAttendance must be used within DataProvider');
  return {
    attendance: ctx.attendance,
    markAttendance: ctx.markAttendance,
    saveBulkAttendance: ctx.saveBulkAttendance,
    setAttendance: ctx.setAttendance,
  };
}

export function useFees() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useFees must be used within DataProvider');
  return {
    payments: ctx.payments,
    addPayment: ctx.addPayment,
    deletePayment: ctx.deletePayment,
    setPayments: ctx.setPayments,
  };
}

export function useSettings() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useSettings must be used within DataProvider');
  return {
    settings: ctx.settings,
    updateSettings: ctx.updateSettings,
    setSettings: ctx.setSettings,
  };
}
