import { useState, useMemo } from 'react';
import { CalendarCheck, Save, Download, UserX, CalendarOff, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Section';
import { useStudents, useAttendance, useSettings, useHolidays } from '../hooks/useData';
import { getToday, formatDate, getCurrentMonth, formatMonth, getMonthFromDate, normalizeDate } from '../utils/dateHelpers';
import { ATTENDANCE_STATUS, HOLIDAY_TYPES, HOLIDAY_TYPE_OPTIONS } from '../utils/constants';
import Select from '../components/ui/Select';
import {
  getStudentAttendanceForDate,
  isPresentStatus,
  isAbsentStatus,
  isSameStudentId,
  normalizeAttendanceStatus,
} from '../utils/attendanceHelpers';
import {
  getHolidayForDate,
  getHolidaysForMonth,
  getHolidayTypeLabel,
  formatHolidayRangeLabel,
  getHolidayRangeDayCount,
} from '../utils/holidayHelpers';
import { downloadStudentAttendancePDF, buildFullMonthAttendanceRows, DAY_STATUS } from '../utils/attendanceReportGenerator';
import { useAlert } from '../context/AlertContext';

export default function Attendance() {
  const { students } = useStudents();
  const { attendance, saveBulkAttendance } = useAttendance();
  const { holidays, addHoliday, removeHoliday } = useHolidays();
  const { settings } = useSettings();
  const { showSuccess, showError, showConfirm } = useAlert();
  const [date, setDate] = useState(getToday());
  const [tab, setTab] = useState('daily');
  const [markData, setMarkData] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentMonth, setStudentMonth] = useState(getCurrentMonth());
  const [absentModal, setAbsentModal] = useState({
    open: false,
    studentId: null,
    studentName: '',
    reason: '',
  });
  const [holidayModal, setHolidayModal] = useState({
    open: false,
    startDate: getToday(),
    endDate: getToday(),
    reason: '',
    type: HOLIDAY_TYPES.PUBLIC,
  });

  const activeStudents = students.filter((s) => s.status === 'Active');
  const selectedHoliday = useMemo(
    () => getHolidayForDate(holidays, date),
    [holidays, date]
  );
  const isSelectedDateHoliday = Boolean(selectedHoliday);
  const monthHolidays = useMemo(
    () => getHolidaysForMonth(holidays, date.slice(0, 7)),
    [holidays, date]
  );

  const initializedMarkData = useMemo(() => {
    const data = {};
    activeStudents.forEach((s) => {
      const existing = getStudentAttendanceForDate(attendance, s.id, date);
      if (existing) {
        data[s.id] = {
          status: normalizeAttendanceStatus(existing.status),
          reason: existing.reason || '',
        };
      }
    });
    return data;
  }, [activeStudents, attendance, date]);

  const currentMarkData = useMemo(
    () => ({ ...initializedMarkData, ...markData }),
    [initializedMarkData, markData]
  );

  const handleDateChange = (newDate) => {
    setDate(normalizeDate(newDate));
    setMarkData({});
  };

  const showSavedFeedback = async (message = 'Attendance saved successfully!') => {
    await showSuccess({
      title: 'Saved!',
      text: message,
      autoCloseMs: 2000,
    });
  };

  const persistStudentAttendance = (studentId, entry) => {
    if (isSelectedDateHoliday) return false;

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate || !studentId || !entry?.status) return false;

    return saveBulkAttendance(
      [
        {
          studentId,
          status: entry.status,
          reason: isAbsentStatus(entry.status) ? entry.reason || '' : '',
        },
      ],
      normalizedDate
    );
  };

  const setPresent = async (studentId) => {
    if (isSelectedDateHoliday) {
      await showError({
        title: 'Holiday',
        text: 'Attendance cannot be marked on a holiday. Remove the holiday first.',
      });
      return;
    }

    const student = activeStudents.find((s) => s.id === studentId);
    const entry = { status: ATTENDANCE_STATUS.PRESENT, reason: '' };
    setMarkData((prev) => ({ ...prev, [studentId]: entry }));

    if (persistStudentAttendance(studentId, entry)) {
      setMarkData((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      await showSavedFeedback(
        `${student?.studentName || 'Student'} marked as Present for ${formatDate(date)}.`
      );
    } else {
      await showError({
        title: 'Save Failed',
        text: 'Could not save attendance. Please try again.',
      });
    }
  };

  const openAbsentModal = (student) => {
    if (isSelectedDateHoliday) return;
    const existing = currentMarkData[student.id];
    setAbsentModal({
      open: true,
      studentId: student.id,
      studentName: student.studentName,
      reason:
        existing && isAbsentStatus(existing.status) ? existing.reason || '' : '',
    });
  };

  const closeAbsentModal = () => {
    setAbsentModal({ open: false, studentId: null, studentName: '', reason: '' });
  };

  const confirmAbsent = async () => {
    if (isSelectedDateHoliday) {
      closeAbsentModal();
      return;
    }

    const reason = absentModal.reason.trim();
    if (!reason) {
      await showError({
        title: 'Validation Error',
        text: 'Please enter reason for absence',
      });
      return;
    }
    const entry = { status: ATTENDANCE_STATUS.ABSENT, reason };
    setMarkData((prev) => ({
      ...prev,
      [absentModal.studentId]: entry,
    }));

    if (persistStudentAttendance(absentModal.studentId, entry)) {
      setMarkData((prev) => {
        const next = { ...prev };
        delete next[absentModal.studentId];
        return next;
      });
      await showSavedFeedback(
        `${absentModal.studentName} marked as Absent for ${formatDate(date)}.`
      );
    } else {
      await showError({
        title: 'Save Failed',
        text: 'Could not save attendance. Please try again.',
      });
    }

    closeAbsentModal();
  };

  const openHolidayModal = () => {
    setHolidayModal({
      open: true,
      startDate: date,
      endDate: date,
      reason: selectedHoliday?.reason || '',
      type: selectedHoliday?.type || HOLIDAY_TYPES.PUBLIC,
    });
  };

  const closeHolidayModal = () => {
    setHolidayModal({
      open: false,
      startDate: getToday(),
      endDate: getToday(),
      reason: '',
      type: HOLIDAY_TYPES.PUBLIC,
    });
  };

  const confirmHoliday = async () => {
    const reason = holidayModal.reason.trim();
    const startDate = normalizeDate(holidayModal.startDate);
    const endDate = normalizeDate(holidayModal.endDate || holidayModal.startDate);
    const dayCount = getHolidayRangeDayCount(startDate, endDate);

    if (!reason) {
      await showError({
        title: 'Validation Error',
        text: 'Please enter a reason for the holiday',
      });
      return;
    }

    if (!dayCount) {
      await showError({
        title: 'Validation Error',
        text: 'End date cannot be before start date',
      });
      return;
    }

    const result = addHoliday(startDate, reason, holidayModal.type, endDate);
    if (!result.success) {
      await showError({
        title: 'Could Not Save',
        text: result.error || 'Failed to mark holiday.',
      });
      return;
    }

    setMarkData({});
    closeHolidayModal();

    const skippedNote =
      result.skipped > 0
        ? ` (${result.skipped} day${result.skipped > 1 ? 's' : ''} already marked)`
        : '';

    await showSuccess({
      title: result.added > 1 ? 'Holidays Marked!' : 'Holiday Marked!',
      text:
        result.added > 1
          ? `${result.added} days marked as holiday (${formatHolidayRangeLabel(startDate, endDate)}) — ${reason}.${skippedNote}`
          : `${formatDate(startDate)} marked as holiday — ${reason}.${skippedNote}`,
      autoCloseMs: 2500,
    });
  };

  const handleRemoveHoliday = async () => {
    if (!selectedHoliday) return;

    const confirmed = await showConfirm({
      title: 'Remove Holiday?',
      text: `Remove holiday on ${formatDate(date)}? You will be able to mark attendance again.`,
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    removeHoliday(selectedHoliday.id);
    await showSuccess({
      title: 'Holiday Removed',
      text: `${formatDate(date)} is open for attendance again.`,
      autoCloseMs: 2000,
    });
  };

  const handleSave = async () => {
    if (isSelectedDateHoliday) {
      await showError({
        title: 'Holiday',
        text: 'Attendance cannot be marked on a holiday.',
      });
      return;
    }

    const records = activeStudents
      .filter((s) => currentMarkData[s.id]?.status)
      .map((s) => {
        const entry = currentMarkData[s.id];
        return {
          studentId: s.id,
          status: entry.status,
          reason: isAbsentStatus(entry.status) ? entry.reason || '' : '',
        };
      });

    if (records.length === 0) {
      await showError({
        title: 'Nothing to Save',
        text: 'Mark at least one student before saving.',
      });
      return;
    }

    const success = saveBulkAttendance(records, date);
    if (!success) {
      await showError({
        title: 'Save Failed',
        text: 'Could not save attendance. Please try again.',
      });
      return;
    }

    setMarkData({});
    await showSavedFeedback(
      `${records.length} attendance record${records.length > 1 ? 's' : ''} saved for ${formatDate(date)}.`
    );
  };

  const presentCount = Object.values(currentMarkData).filter((m) =>
    isPresentStatus(m.status)
  ).length;
  const absentCount = Object.values(currentMarkData).filter((m) =>
    isAbsentStatus(m.status)
  ).length;

  const monthlyReport = useMemo(() => {
    const month = date.slice(0, 7);
    return activeStudents.map((s) => {
      const records = attendance.filter(
        (a) => isSameStudentId(a.studentId, s.id) && getMonthFromDate(a.date) === month
      );
      const present = records.filter((a) => isPresentStatus(a.status)).length;
      const pct = records.length > 0 ? (present / records.length) * 100 : 0;
      return { student: s, present, total: records.length, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [activeStudents, attendance, date]);

  const studentMonthRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return attendance
      .filter(
        (a) =>
          isSameStudentId(a.studentId, selectedStudentId) &&
          getMonthFromDate(a.date) === studentMonth
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendance, selectedStudentId, studentMonth]);

  const studentMonthDays = useMemo(() => {
    if (!selectedStudentId) return [];
    return buildFullMonthAttendanceRows(
      studentMonth,
      studentMonthRecords,
      holidays,
      selectedStudentId
    );
  }, [selectedStudentId, studentMonth, studentMonthRecords, holidays]);

  const studentMonthStats = useMemo(() => {
    const present = studentMonthDays.filter((r) => r.status === DAY_STATUS.PRESENT).length;
    const absent = studentMonthDays.filter((r) => r.status === DAY_STATUS.ABSENT).length;
    const holiday = studentMonthDays.filter((r) => r.status === DAY_STATUS.HOLIDAY).length;
    const notAdded = studentMonthDays.filter((r) => r.status === DAY_STATUS.NOT_ADDED).length;
    const marked = present + absent;
    const pct = marked > 0 ? (present / marked) * 100 : 0;
    return { present, absent, holiday, notAdded, total: studentMonthDays.length, pct };
  }, [studentMonthDays]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleExportAttendance = async () => {
    if (!selectedStudent) return;
    await downloadStudentAttendancePDF(
      selectedStudent,
      studentMonthRecords,
      studentMonth,
      settings,
      holidays
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Attendance" subtitle="Mark daily attendance" />

      <div className="flex gap-2 mb-4">
        {['daily', 'monthly', 'student'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t === 'daily' ? 'Daily' : t === 'monthly' ? 'Monthly' : 'Student'}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <>
          <Card className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />

            {isSelectedDateHoliday ? (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <CalendarOff size={18} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900">Holiday — Tuition Closed</p>
                    <p className="text-xs text-amber-800 mt-0.5">{selectedHoliday.reason}</p>
                    <p className="text-[10px] font-semibold text-amber-600 uppercase mt-1.5 tracking-wide">
                      {getHolidayTypeLabel(selectedHoliday.type)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={handleRemoveHoliday}
                >
                  <Trash2 size={14} /> Remove Holiday
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-3 mt-3">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
                    <p className="text-base font-bold text-emerald-700">{presentCount}</p>
                    <p className="text-[10px] font-semibold text-emerald-600">Present</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                    <p className="text-base font-bold text-red-700">{absentCount}</p>
                    <p className="text-[10px] font-semibold text-red-600">Absent</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  className="mt-3 border-amber-200 text-amber-800 hover:bg-amber-50"
                  onClick={openHolidayModal}
                >
                  <CalendarOff size={16} /> Mark as Holiday
                </Button>
              </>
            )}
          </Card>

          {isSelectedDateHoliday ? (
            <EmptyState
              icon={CalendarOff}
              title="Tuition closed"
              description={`No attendance on ${formatDate(date)}. ${selectedHoliday.reason}`}
            />
          ) : activeStudents.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No active students" description="Add students to mark attendance" />
          ) : (
            <div className="space-y-3 mb-4">
              {activeStudents.map((s) => {
                const entry = currentMarkData[s.id];
                const status = entry?.status || null;
                return (
                  <Card key={s.id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.studentName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.studentName}</p>
                        <p className="text-xs text-slate-500">{s.standard}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setPresent(s.id)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation ${
                          isPresentStatus(status)
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => openAbsentModal(s)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation ${
                          isAbsentStatus(status)
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                    {isAbsentStatus(status) && entry?.reason && (
                      <div className="mt-2.5 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-[10px] font-semibold text-red-500 uppercase">Absence Reason</p>
                        <p className="text-xs text-red-700 mt-0.5">{entry.reason}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {!isSelectedDateHoliday && activeStudents.length > 0 && (
            <Button fullWidth size="lg" onClick={handleSave}>
              <Save size={16} /> Save All
            </Button>
          )}
        </>
      )}

      {tab === 'monthly' && (
        <div className="space-y-3">
          <Card className="mb-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Month</label>
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => handleDateChange(`${e.target.value}-01`)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {monthHolidays.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-2">
                  Holidays this month ({monthHolidays.length})
                </p>
                <div className="space-y-1.5">
                  {monthHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2"
                    >
                      <span className="font-semibold text-slate-700">{formatDate(h.date)}</span>
                      <span className="text-amber-800 truncate text-right">{h.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {monthlyReport.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No data" description="No attendance records for this month" />
          ) : (
            monthlyReport.map(({ student, present, total, pct }) => (
              <Card key={student.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={student.studentName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{student.studentName}</p>
                    <p className="text-xs text-slate-500">{present}/{total} days present</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-3">
          <Select
            label="Select Student"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Choose a student</option>
            {activeStudents.map((s) => (
              <option key={s.id} value={s.id}>{s.studentName} — {s.standard}</option>
            ))}
          </Select>

          {selectedStudentId && (
            <Card>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select Month</label>
              <input
                type="month"
                value={studentMonth}
                onChange={(e) => setStudentMonth(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </Card>
          )}

          {selectedStudent && (
            <Card>
              <div className="flex items-center gap-3">
                <Avatar name={selectedStudent.studentName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{selectedStudent.studentName}</p>
                  <p className="text-xs text-slate-500">{selectedStudent.standard} · {formatMonth(studentMonth)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${studentMonthStats.pct >= 75 ? 'text-emerald-600' : studentMonthStats.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {studentMonthStats.pct.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">This Month</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50">
                <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
                  <p className="text-sm font-bold text-emerald-700">{studentMonthStats.present}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Present</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2 text-center border border-red-100">
                  <p className="text-sm font-bold text-red-700">{studentMonthStats.absent}</p>
                  <p className="text-[10px] text-red-600 font-semibold">Absent</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
                  <p className="text-sm font-bold text-amber-700">{studentMonthStats.holiday}</p>
                  <p className="text-[10px] text-amber-600 font-semibold">Holiday</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">{studentMonthStats.notAdded}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Not Added</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                {studentMonthStats.total} days in {formatMonth(studentMonth)}
              </p>
              <Button
                variant="outline"
                fullWidth
                className="mt-3 transition-all duration-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 hover:shadow-md hover:shadow-blue-100 active:scale-[0.98] active:bg-blue-100"
                onClick={handleExportAttendance}
              >
                <Download size={16} /> Export PDF
              </Button>
            </Card>
          )}

          {!selectedStudentId ? (
            <EmptyState icon={CalendarCheck} title="Select a student" description="Choose a student to view their attendance history" />
          ) : (
            studentMonthDays.map((row) => {
              const badgeVariant =
                row.status === DAY_STATUS.PRESENT
                  ? 'present'
                  : row.status === DAY_STATUS.ABSENT
                    ? 'absent'
                    : row.status === DAY_STATUS.HOLIDAY
                      ? 'holiday'
                      : 'unmarked';

              return (
                <Card key={row.date}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{formatDate(row.date)}</p>
                      {row.status === DAY_STATUS.ABSENT && row.reason && row.reason !== '—' && (
                        <p className="text-xs text-red-600 mt-1">Reason: {row.reason}</p>
                      )}
                      {row.status === DAY_STATUS.HOLIDAY && row.reason && row.reason !== '—' && (
                        <p className="text-xs text-amber-700 mt-1">{row.reason}</p>
                      )}
                    </div>
                    <Badge variant={badgeVariant}>{row.label}</Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      <Modal isOpen={absentModal.open} onClose={closeAbsentModal} title="Absence Reason">
        <div className="flex items-start gap-3 mb-4 rounded-xl bg-red-50/80 border border-red-100 px-3.5 py-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <UserX size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {absentModal.studentName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Absent on <span className="font-semibold text-slate-700">{formatDate(date)}</span>
            </p>
          </div>
        </div>

        <Input
          label="Reason"
          value={absentModal.reason}
          onChange={(e) => {
            setAbsentModal((prev) => ({ ...prev, reason: e.target.value }));
          }}
          placeholder="e.g. Sick leave, family emergency..."
          autoFocus
        />

        <div className="flex gap-3 mt-5">
          <Button variant="outline" fullWidth onClick={closeAbsentModal}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={confirmAbsent}
            className="bg-red-600 text-white border-transparent shadow-lg shadow-red-600/20 active:bg-red-700"
          >
            Mark Absent
          </Button>
        </div>
      </Modal>

      <Modal isOpen={holidayModal.open} onClose={closeHolidayModal} title="Mark Holiday">
        <div className="flex items-start gap-3 mb-4 rounded-xl bg-amber-50/80 border border-amber-100 px-3.5 py-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <CalendarOff size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Tuition Closed</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one day or a date range for holidays
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={holidayModal.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  setHolidayModal((prev) => ({
                    ...prev,
                    startDate,
                    endDate:
                      prev.endDate && prev.endDate < startDate ? startDate : prev.endDate || startDate,
                  }));
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={holidayModal.endDate}
                min={holidayModal.startDate}
                onChange={(e) =>
                  setHolidayModal((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate) > 1 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate)} days will be
              marked: {formatHolidayRangeLabel(holidayModal.startDate, holidayModal.endDate)}
            </p>
          )}

          <Select
            label="Holiday Type"
            value={holidayModal.type}
            onChange={(e) =>
              setHolidayModal((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            {HOLIDAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Input
            label="Reason"
            value={holidayModal.reason}
            onChange={(e) =>
              setHolidayModal((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="e.g. Diwali, Personal leave, Festival..."
            autoFocus
          />
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="outline" fullWidth onClick={closeHolidayModal}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={confirmHoliday}
            className="bg-amber-600 text-white border-transparent shadow-lg shadow-amber-600/20 active:bg-amber-700"
          >
            {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate) > 1
              ? `Mark ${getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate)} Days`
              : 'Mark Holiday'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
