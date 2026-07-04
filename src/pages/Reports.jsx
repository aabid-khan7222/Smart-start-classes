import { Users, IndianRupee, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader, ListItem, Avatar } from '../components/ui/Section';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { useStudents, useFees, useAttendance } from '../hooks/useData';
import { getMonthlyCollection, getTotalPendingFees } from '../utils/feeHelpers';
import { getBestAndLowAttendance } from '../utils/attendanceHelpers';
import { getCurrentMonth } from '../utils/dateHelpers';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function Reports() {
  const { students } = useStudents();
  const { payments } = useFees();
  const { attendance } = useAttendance();
  const month = getCurrentMonth();

  const activeStudents = students.filter((s) => s.status === 'Active');
  const totalCollection = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const monthCollection = getMonthlyCollection(payments, month);
  const pendingFees = getTotalPendingFees(students, payments, month);
  const { best, low } = getBestAndLowAttendance(students, attendance);

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Reports" subtitle="Overview & insights" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Students" value={activeStudents.length} icon={Users} color="blue" />
        <StatCard label="All-time Collection" value={formatCurrency(totalCollection)} icon={IndianRupee} color="green" />
        <StatCard label="This Month" value={formatCurrency(monthCollection)} icon={IndianRupee} color="blue" />
        <StatCard label="Pending Fees" value={formatCurrency(pendingFees)} icon={Clock} color="amber" />
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">Best Attendance</h3>
        </div>
        {best.length === 0 || best[0].percentage === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">No attendance data yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {best.filter((b) => b.percentage > 0).map(({ student, percentage }) => (
              <ListItem
                key={student.id}
                avatar={<Avatar name={student.studentName} size="sm" />}
                title={student.studentName}
                subtitle={student.standard}
                right={<span className="text-sm font-bold text-emerald-600">{formatPercent(percentage)}</span>}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-red-600" />
          <h3 className="text-sm font-bold text-slate-800">Low Attendance</h3>
        </div>
        {low.length === 0 || low.every((l) => l.percentage === 0) ? (
          <p className="text-sm text-slate-400 text-center py-3">No attendance data yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {low.filter((l) => l.percentage >= 0).slice(0, 5).map(({ student, percentage }) => (
              <ListItem
                key={student.id}
                avatar={<Avatar name={student.studentName} size="sm" />}
                title={student.studentName}
                subtitle={student.standard}
                right={
                  <span className={`text-sm font-bold ${percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                    {formatPercent(percentage)}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Class Distribution</h3>
        <div className="space-y-2">
          {['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th'].map((cls) => {
            const count = activeStudents.filter((s) => s.standard === cls).length;
            const pct = activeStudents.length > 0 ? (count / activeStudents.length) * 100 : 0;
            return (
              <div key={cls}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{cls}</span>
                  <span className="text-slate-500">{count} students</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
