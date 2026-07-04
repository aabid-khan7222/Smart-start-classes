import { FEE_STATUS } from './constants';
import { getCurrentMonth, getLastNMonths } from './dateHelpers';

export function getPaidAmountForMonth(student, month, payments) {
  return payments
    .filter((p) => p.studentId === student.id && p.paymentMonth === month)
    .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
}

export function getStudentFeeSummary(student, payments, month = getCurrentMonth()) {
  const monthlyFee = Number(student.monthlyFees) || 0;
  const paidAmount = getPaidAmountForMonth(student, month, payments);
  const remainingAmount = Math.max(0, monthlyFee - paidAmount);

  let status;
  if (student.status === 'Inactive') {
    status = FEE_STATUS.PAID;
  } else if (monthlyFee > 0 && paidAmount >= monthlyFee) {
    status = FEE_STATUS.PAID;
  } else if (paidAmount > 0 && paidAmount < monthlyFee) {
    status = FEE_STATUS.PARTIAL;
  } else {
    const today = new Date();
    const [year, mon] = month.split('-').map(Number);
    const dueDay = Math.min(Number(student.feeDueDate) || 1, 28);
    const dueDate = new Date(year, mon - 1, dueDay);
    status = today > dueDate ? FEE_STATUS.OVERDUE : FEE_STATUS.PENDING;
  }

  return { monthlyFee, paidAmount, remainingAmount, status };
}

/**
 * Validates a payment before saving.
 * Rules:
 * - Amount must be > 0
 * - Cannot pay if month is already fully paid
 * - Amount cannot exceed remaining balance for that month
 * - Total paid for month cannot exceed monthly fee
 */
export function validatePaymentAmount(student, month, amountPaid, payments) {
  const amount = Math.round(Number(amountPaid));

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      error: 'Enter a valid amount greater than 0',
      maxAllowed: 0,
      amount: 0,
      summary: null,
    };
  }

  const summary = getStudentFeeSummary(student, payments, month);
  const { monthlyFee, paidAmount, remainingAmount, status } = summary;

  if (monthlyFee <= 0) {
    return {
      valid: false,
      error: 'Monthly fee is not set for this student',
      maxAllowed: 0,
      amount,
      summary,
    };
  }

  if (status === FEE_STATUS.PAID || remainingAmount <= 0) {
    return {
      valid: false,
      error: 'Fees already fully paid for this month. No additional payment allowed.',
      maxAllowed: 0,
      amount,
      summary,
    };
  }

  if (amount > remainingAmount) {
    return {
      valid: false,
      error: `Maximum allowed: ₹${remainingAmount.toLocaleString('en-IN')} (remaining of ₹${monthlyFee.toLocaleString('en-IN')} monthly fee, ₹${paidAmount.toLocaleString('en-IN')} already paid)`,
      maxAllowed: remainingAmount,
      amount,
      summary,
    };
  }

  return {
    valid: true,
    error: null,
    maxAllowed: remainingAmount,
    amount,
    summary,
  };
}

export function getFeeStatusForMonth(student, month, payments) {
  return getStudentFeeSummary(student, payments, month).status;
}

export function getStudentFeeStatus(student, payments, month = getCurrentMonth()) {
  return getStudentFeeSummary(student, payments, month).status;
}

export function getFeeStatusColor(status) {
  switch (status) {
    case FEE_STATUS.PAID:
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' };
    case FEE_STATUS.PARTIAL:
      return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' };
    case FEE_STATUS.PENDING:
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' };
    case FEE_STATUS.OVERDUE:
      return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' };
  }
}

export function getMonthlyCollection(payments, month) {
  return payments
    .filter((p) => p.paymentMonth === month)
    .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
}

export function getTotalCollection(payments) {
  return payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
}

export function getAvailableMonths(payments, count = 24) {
  const months = new Set(getLastNMonths(count));
  payments.forEach((p) => {
    if (p.paymentMonth) months.add(p.paymentMonth);
  });
  return [...months].sort((a, b) => b.localeCompare(a));
}

export function getTotalPendingFees(students, payments, month = getCurrentMonth()) {
  return students
    .filter((s) => s.status === 'Active')
    .reduce((sum, s) => {
      const { remainingAmount, status } = getStudentFeeSummary(s, payments, month);
      return status === FEE_STATUS.PAID ? sum : sum + remainingAmount;
    }, 0);
}

export function getFeeStatusCounts(students, payments, month = getCurrentMonth()) {
  const active = students.filter((s) => s.status === 'Active');
  const counts = { paid: 0, partial: 0, pending: 0, overdue: 0 };

  active.forEach((s) => {
    const { status } = getStudentFeeSummary(s, payments, month);
    if (status === FEE_STATUS.PAID) counts.paid += 1;
    else if (status === FEE_STATUS.PARTIAL) counts.partial += 1;
    else if (status === FEE_STATUS.OVERDUE) counts.overdue += 1;
    else counts.pending += 1;
  });

  return {
    ...counts,
    unpaid: counts.partial + counts.pending + counts.overdue,
    total: active.length,
  };
}

export function getPaidUnpaidCounts(students, payments, month = getCurrentMonth()) {
  const counts = getFeeStatusCounts(students, payments, month);
  return { paid: counts.paid, unpaid: counts.unpaid, total: counts.total };
}

export function getStudentPaymentHistory(studentId, payments) {
  return payments
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
}

export function getRecentPayments(payments, limit = 5) {
  return [...payments]
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    .slice(0, limit);
}
