import { useState, useMemo } from 'react';
import { CalendarCheck, Save, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Section';
import { useStudents, useAttendance, useSettings } from '../hooks/useData';
import { getToday, formatDate, getCurrentMonth, formatMonth, getMonthFromDate, normalizeDate } from '../utils/dateHelpers';
import { ATTENDANCE_STATUS } from '../utils/constants';
import Select from '../components/ui/Select';
import {
  getStudentAttendanceForDate,
  isPresentStatus,
  isAbsentStatus,
  isSameStudentId,
  normalizeAttendanceStatus,
} from '../utils/attendanceHelpers';
import { downloadStudentAttendancePDF } from '../utils/attendanceReportGenerator';
import { useAlert } from '../context/AlertContext';

export default function Attendance() {
  const { students } = useStudents();
  const { attendance, saveBulkAttendance } = useAttendance();
  const { settings } = useSettings();
  const { showSuccess, showError } = useAlert();
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

  const activeStudents = students.filter((s) => s.status === 'Active');

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

  const handleSave = async () => {
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

  const studentMonthStats = useMemo(() => {
    const present = studentMonthRecords.filter((r) => isPresentStatus(r.status)).length;
    const absent = studentMonthRecords.filter((r) => isAbsentStatus(r.status)).length;
    const total = studentMonthRecords.length;
    const pct = total > 0 ? (present / total) * 100 : 0;
    return { present, absent, total, pct };
  }, [studentMonthRecords]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleExportAttendance = async () => {
    if (!selectedStudent) return;
    await downloadStudentAttendancePDF(selectedStudent, studentMonthRecords, studentMonth, settings);
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
          </Card>

          {activeStudents.length === 0 ? (
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

          {activeStudents.length > 0 && (
            <>
              <Button fullWidth size="lg" onClick={handleSave}>
                <Save size={16} /> Save All
              </Button>
            </>
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
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-50">
                <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
                  <p className="text-sm font-bold text-emerald-700">{studentMonthStats.present}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Present</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2 text-center border border-red-100">
                  <p className="text-sm font-bold text-red-700">{studentMonthStats.absent}</p>
                  <p className="text-[10px] text-red-600 font-semibold">Absent</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">{studentMonthStats.total}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Total</p>
                </div>
              </div>
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
          ) : studentMonthRecords.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No records" description={`No attendance marked for ${formatMonth(studentMonth)}`} />
          ) : (
            studentMonthRecords.map((record) => (
              <Card key={record.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{formatDate(record.date)}</p>
                    {isAbsentStatus(record.status) && record.reason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {record.reason}</p>
                    )}
                  </div>
                  <Badge variant={isPresentStatus(record.status) ? 'present' : 'absent'}>
                    {isPresentStatus(record.status) ? 'Present' : 'Absent'}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal isOpen={absentModal.open} onClose={closeAbsentModal} title="Absence Reason">
        <p className="text-sm text-slate-600 mb-4">
          Why is <strong>{absentModal.studentName}</strong> absent on <strong>{formatDate(date)}</strong>?
        </p>

        <Input
          label="Reason"
          value={absentModal.reason}
          onChange={(e) => {
            setAbsentModal((prev) => ({ ...prev, reason: e.target.value }));
          }}
          placeholder="Enter absence reason..."
        />

        <div className="flex gap-3 mt-5">
          <Button variant="outline" fullWidth onClick={closeAbsentModal}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={confirmAbsent}>Mark Absent</Button>
        </div>
      </Modal>
    </div>
  );
}
