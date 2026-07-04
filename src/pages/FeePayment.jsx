import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useStudents, useFees, useSettings } from '../hooks/useData';
import { PAYMENT_MODES, FEE_STATUS } from '../utils/constants';
import { getCurrentMonth, formatMonth } from '../utils/dateHelpers';
import { getStudentFeeSummary, validatePaymentAmount } from '../utils/feeHelpers';
import { formatCurrency } from '../utils/formatters';
import { openAndDownloadReceipt } from '../utils/receiptGenerator';

export default function FeePayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { students } = useStudents();
  const { payments, addPayment } = useFees();
  const { settings } = useSettings();
  const activeStudents = students.filter((s) => s.status === 'Active');

  const preselectedId = location.state?.studentId || '';

  const [form, setForm] = useState({
    studentId: preselectedId,
    amountPaid: '',
    paymentMonth: getCurrentMonth(),
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    remarks: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (preselectedId) {
      const student = students.find((s) => s.id === preselectedId);
      if (!student) return;
      const summary = getStudentFeeSummary(student, payments, getCurrentMonth());
      setForm((prev) => ({
        ...prev,
        studentId: preselectedId,
        amountPaid: summary.remainingAmount > 0 ? String(summary.remainingAmount) : '',
      }));
    }
  }, [preselectedId, students, payments]);

  const selectedStudent = students.find((s) => s.id === form.studentId);
  const feeSummary = selectedStudent
    ? getStudentFeeSummary(selectedStudent, payments, form.paymentMonth)
    : null;

  const isFullyPaid = feeSummary?.status === FEE_STATUS.PAID || feeSummary?.remainingAmount <= 0;
  const maxPayable = feeSummary?.remainingAmount ?? 0;

  const getSuggestedAmount = (studentId, paymentMonth) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return '';
    const summary = getStudentFeeSummary(student, payments, paymentMonth);
    return summary.remainingAmount > 0 ? String(summary.remainingAmount) : '';
  };

  const update = (field, value) => {
    setSubmitError('');
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'studentId') {
        next.amountPaid = getSuggestedAmount(value, next.paymentMonth);
      }
      if (field === 'paymentMonth' && next.studentId) {
        next.amountPaid = getSuggestedAmount(next.studentId, value);
      }

      return next;
    });
  };

  const validateForm = () => {
    const e = {};

    if (!form.studentId) {
      e.studentId = 'Select a student';
    }
    if (!form.paymentMonth) {
      e.paymentMonth = 'Required';
    }

    if (selectedStudent && form.paymentMonth) {
      const validation = validatePaymentAmount(
        selectedStudent,
        form.paymentMonth,
        form.amountPaid,
        payments
      );
      if (!validation.valid) {
        e.amountPaid = validation.error;
      }
    } else if (!form.amountPaid || Number(form.amountPaid) <= 0) {
      e.amountPaid = 'Enter a valid amount';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    const result = addPayment({
      ...form,
      amountPaid: Number(form.amountPaid),
    });

    if (!result.success) {
      setSubmitError(result.error);
      setErrors((prev) => ({ ...prev, amountPaid: result.error }));
      return;
    }

    const student = students.find((s) => s.id === form.studentId);
    if (student && result.payment) {
      try {
        openAndDownloadReceipt(
          result.payment,
          student,
          [result.payment, ...payments],
          settings
        );
      } catch (err) {
        console.error('Receipt generation failed:', err);
      }
    }

    navigate('/fees');
  };

  const canSubmit = selectedStudent && !isFullyPaid && maxPayable > 0;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/fees')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-4">
        <ArrowLeft size={18} /> Back
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-5">Record Payment</h1>

      {submitError && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Student"
          value={form.studentId}
          onChange={(e) => update('studentId', e.target.value)}
          error={errors.studentId}
        >
          <option value="">Select student</option>
          {activeStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.studentName} — {s.standard}</option>
          ))}
        </Select>

        <Input
          label="Payment Month"
          type="month"
          value={form.paymentMonth}
          onChange={(e) => update('paymentMonth', e.target.value)}
          error={errors.paymentMonth}
        />

        {feeSummary && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {formatMonth(form.paymentMonth)} — Fee Summary
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
                <p className="text-[10px] text-slate-500 font-medium">Monthly Fee</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(feeSummary.monthlyFee)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-medium">Paid</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(feeSummary.paidAmount)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center border border-amber-100">
                <p className="text-[10px] text-amber-600 font-medium">Remaining</p>
                <p className="text-sm font-bold text-amber-700 mt-0.5">{formatCurrency(feeSummary.remainingAmount)}</p>
              </div>
            </div>
            {selectedStudent && (
              <p className="text-xs text-slate-500">Due date: {selectedStudent.feeDueDate}th of every month</p>
            )}
            {isFullyPaid ? (
              <p className="text-xs font-semibold text-emerald-600">
                Fees fully paid for this month — no more payments allowed
              </p>
            ) : (
              <p className="text-xs font-semibold text-blue-600">
                Maximum payable: {formatCurrency(maxPayable)}
              </p>
            )}
          </div>
        )}

        <Input
          label="Amount Paid (₹)"
          type="number"
          min={1}
          max={maxPayable > 0 ? maxPayable : undefined}
          step={1}
          value={form.amountPaid}
          onChange={(e) => update('amountPaid', e.target.value)}
          error={errors.amountPaid}
          placeholder={maxPayable > 0 ? `Max: ${maxPayable}` : 'No balance due'}
          disabled={!canSubmit}
        />

        <Input
          label="Payment Date"
          type="date"
          value={form.paymentDate}
          onChange={(e) => update('paymentDate', e.target.value)}
        />

        <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => update('paymentMode', e.target.value)}>
          {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>

        <Input
          label="Remarks"
          value={form.remarks}
          onChange={(e) => update('remarks', e.target.value)}
          placeholder="Optional notes..."
        />

        <div className="pt-2 pb-4">
          <Button type="submit" fullWidth size="lg" variant="success" disabled={!canSubmit}>
            Save Payment
          </Button>
        </div>
      </form>
    </div>
  );
}
