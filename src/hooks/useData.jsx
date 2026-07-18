import { createContext, useCallback, useContext, useMemo } from 'react';
import { ATTENDANCE_STATUS } from '../utils/constants';
import { generateId } from '../utils/storage';
import { defaultSettings } from '../data/defaults';
import { validatePaymentAmount } from '../utils/feeHelpers';
import { normalizeDate } from '../utils/dateHelpers';
import {
  normalizeAttendanceStatus,
  isSameStudentId,
} from '../utils/attendanceHelpers';
import { normalizeHolidayType } from '../utils/holidayHelpers';
import { useSharedStore } from './useSharedStore';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { store, persist } = useSharedStore();

  const students = store.students;
  const attendance = store.attendance;
  const holidays = store.holidays || [];
  const payments = store.fee_payments;
  const settings = store.settings;

  const setStudents = useCallback(
    (updater) => {
      persist((prev) => ({
        ...prev,
        students: typeof updater === 'function' ? updater(prev.students) : updater,
      }));
    },
    [persist]
  );

  const setAttendance = useCallback(
    (updater) => {
      persist((prev) => ({
        ...prev,
        attendance: typeof updater === 'function' ? updater(prev.attendance) : updater,
      }));
    },
    [persist]
  );

  const setHolidays = useCallback(
    (updater) => {
      persist((prev) => ({
        ...prev,
        holidays: typeof updater === 'function' ? updater(prev.holidays || []) : updater,
      }));
    },
    [persist]
  );

  const setPayments = useCallback(
    (updater) => {
      persist((prev) => ({
        ...prev,
        fee_payments: typeof updater === 'function' ? updater(prev.fee_payments) : updater,
      }));
    },
    [persist]
  );

  const setSettings = useCallback(
    (updater) => {
      persist((prev) => ({
        ...prev,
        settings: typeof updater === 'function' ? updater(prev.settings) : updater,
      }));
    },
    [persist]
  );

  const addStudent = useCallback(
    (data) => {
      const student = { ...data, id: generateId(), createdAt: new Date().toISOString() };
      setStudents((prev) => [student, ...prev]);
      return student;
    },
    [setStudents]
  );

  const updateStudent = useCallback(
    (id, data) => {
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    },
    [setStudents]
  );

  const deleteStudent = useCallback(
    (id) => {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    },
    [setStudents]
  );

  const getStudent = useCallback((id) => students.find((s) => s.id === id), [students]);

  const markAttendance = useCallback(
    (studentId, date, status, reason = '') => {
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
    },
    [setAttendance]
  );

  const saveBulkAttendance = useCallback(
    (records, date) => {
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
    },
    [setAttendance]
  );

  const addHoliday = useCallback(
    (date, reason, type = 'public') => {
      const normalizedDate = normalizeDate(date);
      const trimmedReason = String(reason || '').trim();
      if (!normalizedDate || !trimmedReason) {
        return { success: false, error: 'Date and reason are required' };
      }

      let result = { success: true };

      setHolidays((prev) => {
        const exists = prev.some((h) => normalizeDate(h.date) === normalizedDate);
        if (exists) {
          result = { success: false, error: 'A holiday is already marked for this date' };
          return prev;
        }

        const holiday = {
          id: generateId(),
          date: normalizedDate,
          reason: trimmedReason,
          type: normalizeHolidayType(type),
        };
        result = { success: true, holiday };
        return [...prev, holiday];
      });

      return result;
    },
    [setHolidays]
  );

  const removeHoliday = useCallback(
    (idOrDate) => {
      const key = String(idOrDate || '');
      if (!key) return false;

      setHolidays((prev) =>
        prev.filter(
          (h) => h.id !== key && normalizeDate(h.date) !== normalizeDate(key)
        )
      );
      return true;
    },
    [setHolidays]
  );

  const addPayment = useCallback(
    (data) => {
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
    },
    [students, setPayments]
  );

  const deletePayment = useCallback(
    (id) => {
      setPayments((prev) => prev.filter((p) => p.id !== id));
    },
    [setPayments]
  );

  const updateSettings = useCallback(
    (data) => {
      setSettings((prev) => ({ ...defaultSettings, ...prev, ...data }));
    },
    [setSettings]
  );

  const value = useMemo(
    () => ({
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
      holidays,
      setHolidays,
      addHoliday,
      removeHoliday,
      payments,
      setPayments,
      addPayment,
      deletePayment,
      settings,
      setSettings,
      updateSettings,
    }),
    [
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
      holidays,
      setHolidays,
      addHoliday,
      removeHoliday,
      payments,
      setPayments,
      addPayment,
      deletePayment,
      settings,
      setSettings,
      updateSettings,
    ]
  );

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

export function useHolidays() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useHolidays must be used within DataProvider');
  return {
    holidays: ctx.holidays,
    addHoliday: ctx.addHoliday,
    removeHoliday: ctx.removeHoliday,
    setHolidays: ctx.setHolidays,
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
