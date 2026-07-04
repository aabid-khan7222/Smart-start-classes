import { ATTENDANCE_STATUS } from './constants';
import { getToday, normalizeDate, getMonthFromDate } from './dateHelpers';

export function normalizeAttendanceStatus(status) {
  if (!status) return '';
  const value = String(status).toLowerCase().trim();
  if (value === 'present' || value === 'p') return ATTENDANCE_STATUS.PRESENT;
  if (value === 'absent' || value === 'a') return ATTENDANCE_STATUS.ABSENT;
  return value;
}

export function isSameStudentId(left, right) {
  return String(left) === String(right);
}

export function isPresentStatus(status) {
  return normalizeAttendanceStatus(status) === ATTENDANCE_STATUS.PRESENT;
}

export function isAbsentStatus(status) {
  return normalizeAttendanceStatus(status) === ATTENDANCE_STATUS.ABSENT;
}

export function getAttendanceForDate(attendance, date) {
  const target = normalizeDate(date);
  return attendance.filter((a) => normalizeDate(a.date) === target);
}

export function getStudentAttendanceForDate(attendance, studentId, date) {
  const target = normalizeDate(date);
  return attendance.find(
    (a) => isSameStudentId(a.studentId, studentId) && normalizeDate(a.date) === target
  );
}

export function getTodayAttendanceSummary(attendance, students, date = getToday()) {
  const activeStudents = students.filter((s) => s.status === 'Active');
  const dayRecords = getAttendanceForDate(attendance, date);
  const present = dayRecords.filter((a) => isPresentStatus(a.status)).length;
  const absent = dayRecords.filter((a) => isAbsentStatus(a.status)).length;
  const unmarked = activeStudents.length - present - absent;
  return { present, absent, unmarked, total: activeStudents.length };
}

export function calculateAttendancePercentage(attendance, studentId, students) {
  const student = students.find((s) => s.id === studentId);
  if (!student || student.status === 'Inactive') return 0;

  const studentRecords = attendance.filter((a) => isSameStudentId(a.studentId, studentId));
  if (studentRecords.length === 0) return 0;

  const present = studentRecords.filter((a) => isPresentStatus(a.status)).length;
  return (present / studentRecords.length) * 100;
}

export function getMonthlyAttendanceStats(attendance, students, month) {
  const monthRecords = attendance.filter((a) => getMonthFromDate(a.date) === month);
  const activeStudents = students.filter((s) => s.status === 'Active');
  const present = monthRecords.filter((a) => isPresentStatus(a.status)).length;
  const total = monthRecords.length;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  return { present, absent: total - present, total, percentage, activeCount: activeStudents.length };
}

export function getStudentMonthlyAttendance(attendance, studentId, month) {
  const records = attendance.filter(
    (a) => a.studentId === studentId && getMonthFromDate(a.date) === month
  );
  const present = records.filter((a) => isPresentStatus(a.status)).length;
  return { present, absent: records.length - present, total: records.length };
}

export function getBestAndLowAttendance(students, attendance) {
  const active = students.filter((s) => s.status === 'Active');
  const withPct = active.map((s) => ({
    student: s,
    percentage: calculateAttendancePercentage(attendance, s.id, students),
  }));

  withPct.sort((a, b) => b.percentage - a.percentage);
  return {
    best: withPct.slice(0, 3),
    low: [...withPct].sort((a, b) => a.percentage - b.percentage).slice(0, 3),
  };
}

export function getDailyReport(attendance, students, date) {
  const active = students.filter((s) => s.status === 'Active');
  return active.map((s) => {
    const record = getStudentAttendanceForDate(attendance, s.id, date);
    return {
      student: s,
      status: record?.status || 'unmarked',
    };
  });
}
