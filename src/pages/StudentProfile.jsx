import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Phone, MapPin, School, Clock, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Avatar, SectionHeader, ListItem } from '../components/ui/Section';
import ReceiptActions from '../components/ui/ReceiptActions';
import { useStudents, useFees, useAttendance, useSettings } from '../hooks/useData';
import { useState } from 'react';
import { getStudentFeeSummary, getStudentPaymentHistory } from '../utils/feeHelpers';
import { calculateAttendancePercentage } from '../utils/attendanceHelpers';
import { getCurrentMonth } from '../utils/dateHelpers';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatDate, formatMonth } from '../utils/dateHelpers';

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStudent, deleteStudent } = useStudents();
  const { payments } = useFees();
  const { settings } = useSettings();
  const { attendance } = useAttendance();
  const [showDelete, setShowDelete] = useState(false);

  const student = getStudent(id);
  const month = getCurrentMonth();

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Student not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/students')}>Back</Button>
      </div>
    );
  }

  const feeSummary = getStudentFeeSummary(student, payments, month);
  const { status: feeStatus, paidAmount, remainingAmount, monthlyFee } = feeSummary;
  const attPct = calculateAttendancePercentage(attendance, student.id, [student]);
  const paymentHistory = getStudentPaymentHistory(student.id, payments);

  const handleDelete = () => {
    deleteStudent(id);
    navigate('/students');
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/students')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-4">
        <ArrowLeft size={18} /> Back
      </button>

      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={student.studentName} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{student.studentName}</h1>
            <p className="text-sm text-slate-500">{student.standard} · {student.batchTiming}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={student.status === 'Active' ? 'active' : 'inactive'}>{student.status}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{formatPercent(attPct)}</p>
            <p className="text-[10px] font-semibold text-blue-600 uppercase">Attendance</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-lg font-bold text-slate-800">{formatCurrency(monthlyFee)}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Monthly Fee</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(paidAmount)}</p>
            <p className="text-[10px] font-semibold text-emerald-600 uppercase">Paid</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
            <p className="text-sm font-bold text-amber-700">{formatCurrency(remainingAmount)}</p>
            <p className="text-[10px] font-semibold text-amber-600 uppercase">Remaining</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100 flex flex-col items-center justify-center">
            <Badge status={feeStatus} />
            <p className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Status</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Personal Details" />
        <DetailRow icon={Phone} label="Mobile" value={student.mobileNumber} />
        <DetailRow icon={Phone} label="Alternate" value={student.alternateNumber} />
        <DetailRow icon={MapPin} label="Address" value={student.address} />
        <DetailRow icon={School} label="School" value={student.schoolName} />
        <DetailRow icon={Clock} label="Batch" value={student.batchTiming} />
        <DetailRow icon={Calendar} label="Admission Date" value={formatDate(student.admissionDate)} />
        <DetailRow icon={Calendar} label="Fee Due Date" value={`${student.feeDueDate}th of every month`} />
        {student.fatherName && <DetailRow icon={Phone} label="Father" value={student.fatherName} />}
        {student.motherName && <DetailRow icon={Phone} label="Mother" value={student.motherName} />}
      </Card>

      <Card className="mb-4">
        <SectionHeader
          title="Payment History"
          action={
            <button onClick={() => navigate('/fees/pay', { state: { studentId: student.id } })} className="text-xs font-semibold text-blue-600">
              Record Payment
            </button>
          }
        />
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No payments yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {paymentHistory.map((p) => (
              <div key={p.id} className="py-1">
                <ListItem
                  title={formatMonth(p.paymentMonth)}
                  subtitle={`${formatDate(p.paymentDate)} · ${p.paymentMode}`}
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
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3 pb-4">
        <Button variant="outline" fullWidth onClick={() => navigate(`/students/${id}/edit`)}>
          <Edit size={16} /> Edit
        </Button>
        <Button variant="danger" fullWidth onClick={() => setShowDelete(true)}>
          <Trash2 size={16} /> Delete
        </Button>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Student">
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete <strong>{student.studentName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
