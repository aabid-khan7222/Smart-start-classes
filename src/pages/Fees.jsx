import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, IndianRupee, Clock, CheckCircle, AlertCircle, CircleDot } from 'lucide-react';
import { PageHeader, ListItem, Avatar } from '../components/ui/Section';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ReceiptActions from '../components/ui/ReceiptActions';
import { useStudents, useFees, useSettings } from '../hooks/useData';
import { FEE_STATUS } from '../utils/constants';
import {
  getMonthlyCollection,
  getTotalPendingFees,
  getFeeStatusCounts,
  getStudentFeeSummary,
  getRecentPayments,
} from '../utils/feeHelpers';
import { getCurrentMonth, formatMonth, formatDate } from '../utils/dateHelpers';
import { formatCurrency } from '../utils/formatters';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: FEE_STATUS.PAID, label: 'Paid' },
  { key: FEE_STATUS.PARTIAL, label: 'Partial' },
  { key: FEE_STATUS.PENDING, label: 'Pending' },
  { key: FEE_STATUS.OVERDUE, label: 'Overdue' },
];

export default function Fees() {
  const navigate = useNavigate();
  const { students } = useStudents();
  const { payments } = useFees();
  const { settings } = useSettings();
  const [filter, setFilter] = useState('all');
  const month = getCurrentMonth();

  const activeStudents = students.filter((s) => s.status === 'Active');
  const totalCollection = getMonthlyCollection(payments, month);
  const pendingCollection = getTotalPendingFees(students, payments, month);
  const { paid, partial, pending, overdue } = getFeeStatusCounts(students, payments, month);
  const recentPayments = getRecentPayments(payments, 10);

  const studentList = activeStudents
    .map((s) => {
      const summary = getStudentFeeSummary(s, payments, month);
      return { ...s, ...summary };
    })
    .filter((s) => filter === 'all' || s.status === filter);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Fees"
        subtitle={formatMonth(month)}
        action={
          <Button size="sm" onClick={() => navigate('/fees/pay')}>
            <Plus size={16} /> Pay
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total Collection" value={formatCurrency(totalCollection)} icon={IndianRupee} color="green" />
        <StatCard label="Pending Amount" value={formatCurrency(pendingCollection)} icon={Clock} color="amber" />
        <StatCard label="Paid Students" value={paid} icon={CheckCircle} color="green" />
        <StatCard label="Partial Students" value={partial} icon={CircleDot} color="blue" />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {f.label}
            {f.key === FEE_STATUS.PENDING && pending > 0 ? ` (${pending})` : ''}
            {f.key === FEE_STATUS.OVERDUE && overdue > 0 ? ` (${overdue})` : ''}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Student Fee Status</h3>
        {studentList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No students to show</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {studentList.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className="py-3 active:bg-slate-50 cursor-pointer -mx-1 px-1 rounded-xl"
              >
                <ListItem
                  avatar={<Avatar name={s.studentName} size="sm" />}
                  title={s.studentName}
                  subtitle={`Due: ${s.feeDueDate}th · Fee: ${formatCurrency(s.monthlyFee)}`}
                  right={<Badge status={s.status} />}
                />
                <div className="flex gap-2 mt-2 ml-12">
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    Paid: {formatCurrency(s.paidAmount)}
                  </span>
                  {s.remainingAmount > 0 && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      Remaining: {formatCurrency(s.remainingAmount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Payments</h3>
        {recentPayments.length === 0 ? (
          <EmptyState
            icon={IndianRupee}
            title="No payments yet"
            description="Record your first fee payment"
            action={<Button size="sm" onClick={() => navigate('/fees/pay')}><Plus size={16} /> Record Payment</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {recentPayments.map((p) => {
              const student = students.find((st) => st.id === p.studentId);
              return (
                <div key={p.id} className="py-3">
                  <ListItem
                    avatar={<Avatar name={student?.studentName} size="sm" />}
                    title={student?.studentName || 'Unknown'}
                    subtitle={`${formatMonth(p.paymentMonth)} · ${formatDate(p.paymentDate)} · ${p.paymentMode}`}
                    right={
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amountPaid)}</span>
                        <ReceiptActions
                          payment={p}
                          student={student}
                          payments={payments}
                          settings={settings}
                        />
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
