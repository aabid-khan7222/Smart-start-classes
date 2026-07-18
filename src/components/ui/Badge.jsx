import { getFeeStatusColor } from '../../utils/feeHelpers';

export default function Badge({ status, children, variant }) {
  if (variant) {
    const variants = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      inactive: 'bg-slate-100 text-slate-600 border-slate-200',
      present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      absent: 'bg-red-50 text-red-700 border-red-200',
      unmarked: 'bg-slate-50 text-slate-500 border-slate-200',
      holiday: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${variants[variant] || variants.unmarked}`}>
        {children}
      </span>
    );
  }

  const colors = getFeeStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {children || status}
    </span>
  );
}
