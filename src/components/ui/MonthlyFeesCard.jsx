import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getCurrentMonth, formatMonth } from '../../utils/dateHelpers';
import { getMonthlyCollection, getAvailableMonths } from '../../utils/feeHelpers';

export default function MonthlyFeesCard({ payments, delay = 0 }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const months = getAvailableMonths(payments);
  const amount = getMonthlyCollection(payments, selectedMonth);

  return (
    <div
      className="animate-fade-in bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">Monthly Fees Collection</p>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1.5 w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <p className="text-xl font-bold text-slate-900 mt-2 tracking-tight">{formatCurrency(amount)}</p>
        </div>
        <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
          <CalendarDays size={20} className="text-violet-600" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
