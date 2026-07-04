import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User } from 'lucide-react';
import { PageHeader, ListItem, Avatar } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { useStudents, useFees } from '../hooks/useData';
import { STANDARDS } from '../utils/constants';
import { getStudentFeeSummary } from '../utils/feeHelpers';
import { getCurrentMonth } from '../utils/dateHelpers';
import { formatCurrency } from '../utils/formatters';
import { calculateAttendancePercentage } from '../utils/attendanceHelpers';
import { useAttendance } from '../hooks/useData';

export default function Students() {
  const navigate = useNavigate();
  const { students } = useStudents();
  const { payments } = useFees();
  const { attendance } = useAttendance();
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.mobileNumber.includes(search) ||
        s.fatherName?.toLowerCase().includes(search.toLowerCase());
      const matchClass = !filterClass || s.standard === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  const month = getCurrentMonth();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Students"
        subtitle={`${students.length} total enrolled`}
        action={
          <Button size="sm" onClick={() => navigate('/students/add')}>
            <Plus size={16} />
            Add
          </Button>
        }
      />

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {STANDARDS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="No students found"
          description={students.length === 0 ? 'Add your first student to get started' : 'Try adjusting your search or filter'}
          action={
            students.length === 0 && (
              <Button onClick={() => navigate('/students/add')}>
                <Plus size={16} /> Add Student
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const { status: feeStatus, paidAmount, remainingAmount } = getStudentFeeSummary(s, payments, month);
            const attPct = calculateAttendancePercentage(attendance, s.id, students);
            return (
              <Card key={s.id} onClick={() => navigate(`/students/${s.id}`)}>
                <ListItem
                  avatar={<Avatar name={s.studentName} />}
                  title={s.studentName}
                  subtitle={`${s.standard} · ${s.batchTiming}`}
                  right={
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={feeStatus} />
                      <span className="text-[10px] text-slate-400 font-medium">{attPct.toFixed(0)}% att.</span>
                    </div>
                  }
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <span className="text-xs text-slate-500">{s.mobileNumber}</span>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-semibold text-emerald-600">Paid {formatCurrency(paidAmount)}</span>
                    {remainingAmount > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600">Due {formatCurrency(remainingAmount)}</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
