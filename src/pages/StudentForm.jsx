import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useStudents } from '../hooks/useData';
import { STANDARDS, BATCH_TIMINGS, STUDENT_STATUS } from '../utils/constants';
import { emptyStudent } from '../data/defaults';
import { useAlert } from '../context/AlertContext';

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStudent, addStudent, updateStudent } = useStudents();
  const { showSuccess, showError } = useAlert();
  const isEdit = Boolean(id);
  const existing = isEdit ? getStudent(id) : null;

  const [form, setForm] = useState(existing || { ...emptyStudent });
  const [errors, setErrors] = useState({});

  if (isEdit && !existing) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Student not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/students')}>
          Back to Students
        </Button>
      </div>
    );
  }

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    if (!form.monthlyFees) e.monthlyFees = 'Monthly fees is required';
    setErrors(e);
    return { valid: Object.keys(e).length === 0, errors: e };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      await showError({
        title: 'Validation Error',
        text: firstError || 'Please fill all required fields.',
      });
      return;
    }
    const data = { ...form, monthlyFees: Number(form.monthlyFees), feeDueDate: Number(form.feeDueDate) };
    if (isEdit) {
      updateStudent(id, data);
      await showSuccess({
        title: 'Student Updated!',
        text: `${form.studentName.trim()} details saved successfully.`,
      });
      navigate(`/students/${id}`);
    } else {
      const student = addStudent(data);
      await showSuccess({
        title: 'Student Added!',
        text: `${form.studentName.trim()} enrolled successfully.`,
      });
      navigate(`/students/${student.id}`);
    }
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-4 active:text-blue-600"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-5">
        {isEdit ? 'Edit Student' : 'Add Student'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Student Name" value={form.studentName} onChange={(e) => update('studentName', e.target.value)} error={errors.studentName} />
        <Input label="Father Name" value={form.fatherName} onChange={(e) => update('fatherName', e.target.value)} />
        <Input label="Mother Name" value={form.motherName} onChange={(e) => update('motherName', e.target.value)} />
        <Input label="Mobile Number" type="tel" value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} error={errors.mobileNumber} />
        <Input label="Alternate Number" type="tel" value={form.alternateNumber} onChange={(e) => update('alternateNumber', e.target.value)} />
        <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />

        <Select label="Standard / Class" value={form.standard} onChange={(e) => update('standard', e.target.value)}>
          {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <Input label="School Name" value={form.schoolName} onChange={(e) => update('schoolName', e.target.value)} />

        <Select label="Batch Timing" value={form.batchTiming} onChange={(e) => update('batchTiming', e.target.value)}>
          {BATCH_TIMINGS.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Monthly Fees (₹)" type="number" value={form.monthlyFees} onChange={(e) => update('monthlyFees', e.target.value)} error={errors.monthlyFees} />
          <Select label="Fee Due Date" value={form.feeDueDate} onChange={(e) => update('feeDueDate', e.target.value)}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>

        <Input label="Admission Date" type="date" value={form.admissionDate} onChange={(e) => update('admissionDate', e.target.value)} />

        <Select label="Status" value={form.status} onChange={(e) => update('status', e.target.value)}>
          {STUDENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <div className="pt-2 pb-4">
          <Button type="submit" fullWidth size="lg">
            {isEdit ? 'Save Changes' : 'Add Student'}
          </Button>
        </div>
      </form>
    </div>
  );
}
