import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { formatMonth } from '../../utils/dateHelpers';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 text-xs">
      <p className="font-semibold text-slate-700">{formatMonth(payload[0].payload.month)}</p>
      <p className="text-blue-600 font-bold mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function FeeCollectionChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-slate-400">
        No fee data yet
      </div>
    );
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.05)', radius: 8 }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={index === data.length - 1 ? '#2563eb' : '#bfdbfe'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
