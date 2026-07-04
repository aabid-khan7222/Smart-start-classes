import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatPercent } from '../../utils/formatters';

const COLORS = ['#10b981', '#ef4444'];

export default function AttendanceChart({ present, absent }) {
  const total = present + absent;
  const percentage = total > 0 ? (present / total) * 100 : 0;

  const data = [
    { name: 'Present', value: present || 0 },
    { name: 'Absent', value: absent || 0 },
  ];

  if (total === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-slate-400">
        No attendance data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 h-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={50}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-2xl font-bold text-slate-900">{formatPercent(percentage)}</p>
          <p className="text-xs text-slate-500 font-medium">Attendance Rate</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Present: <strong>{present}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-slate-600">Absent: <strong>{absent}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
