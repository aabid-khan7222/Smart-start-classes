import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  IndianRupee,
  Clock,
  ChevronRight,
  CalendarOff,
} from 'lucide-react';
import Header from '../components/layout/Header';
import StatCard from '../components/ui/StatCard';
import MonthlyFeesCard from '../components/ui/MonthlyFeesCard';
import Card from '../components/ui/Card';
import { SectionHeader, ListItem, Avatar } from '../components/ui/Section';
import { useStudents, useAttendance, useFees, useHolidays } from '../hooks/useData';
import { getTodayAttendanceSummary } from '../utils/attendanceHelpers';
import {
  getTotalCollection,
  getTotalPendingFees,
  getRecentPayments,
} from '../utils/feeHelpers';
import { getHolidayForDate, getHolidayTypeLabel } from '../utils/holidayHelpers';
import { getCurrentMonth, getToday, formatMonth } from '../utils/dateHelpers';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { students } = useStudents();
  const { attendance } = useAttendance();
  const { holidays } = useHolidays();
  const { payments } = useFees();

  const month = getCurrentMonth();
  const today = getToday();
  const activeStudents = students.filter((s) => s.status === 'Active');
  const todayHoliday = getHolidayForDate(holidays, today);
  const todaySummary = getTodayAttendanceSummary(attendance, students, today);
  const totalFeesCollected = getTotalCollection(payments);
  const pendingFees = getTotalPendingFees(students, payments, month);
  const recentPayments = getRecentPayments(payments, 4);

  return (
    <div className="space-y-5 animate-fade-in">
      <Header />

      {todayHoliday && (
        <Card className="!bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <CalendarOff size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Today is a Holiday</p>
              <p className="text-xs text-amber-800 mt-0.5">{todayHoliday.reason}</p>
              <p className="text-[10px] font-semibold text-amber-600 uppercase mt-1 tracking-wide">
                {getHolidayTypeLabel(todayHoliday.type)} · Tuition Closed
              </p>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="text-xs font-semibold text-amber-700 shrink-0"
            >
              View
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Students" value={activeStudents.length} icon={Users} color="blue" delay={0} />
        <StatCard label="Present Today" value={todayHoliday ? '—' : todaySummary.present} icon={UserCheck} color="green" delay={50} />
        <StatCard label="Absent Today" value={todayHoliday ? '—' : todaySummary.absent} icon={UserX} color="red" delay={100} />
        <StatCard label="Total Fees Collected" value={formatCurrency(totalFeesCollected)} icon={IndianRupee} color="green" delay={150} />
        <StatCard label="Pending Fees" value={formatCurrency(pendingFees)} icon={Clock} color="amber" delay={200} />
        <MonthlyFeesCard payments={payments} delay={250} />
      </div>

      <Card>
        <SectionHeader
          title="Today's Attendance"
          action={
            <button onClick={() => navigate('/attendance')} className="text-xs font-semibold text-blue-600">
              {todayHoliday ? 'View' : 'Mark'}
            </button>
          }
        />
        {todayHoliday ? (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
            <CalendarOff size={22} className="mx-auto text-amber-600 mb-2" />
            <p className="text-sm font-semibold text-amber-900">Tuition Closed</p>
            <p className="text-xs text-amber-700 mt-1">{todayHoliday.reason}</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-lg font-bold text-emerald-700">{todaySummary.present}</p>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Present</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <p className="text-lg font-bold text-red-700">{todaySummary.absent}</p>
              <p className="text-[10px] font-semibold text-red-600 uppercase">Absent</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-lg font-bold text-slate-700">{todaySummary.unmarked}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Pending</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Recent Fee Payments"
          action={
            <button onClick={() => navigate('/fees')} className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
              View all <ChevronRight size={14} />
            </button>
          }
        />
        {recentPayments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No payments recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentPayments.map((p) => {
              const student = students.find((s) => s.id === p.studentId);
              return (
                <ListItem
                  key={p.id}
                  avatar={<Avatar name={student?.studentName} size="sm" />}
                  title={student?.studentName || 'Unknown'}
                  subtitle={`${formatMonth(p.paymentMonth)} · ${p.paymentMode}`}
                  right={<span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amountPaid)}</span>}
                />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
