import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, subMonths } from 'date-fns';

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatMonth(monthStr) {
  if (!monthStr) return '—';
  try {
    return format(parseISO(`${monthStr}-01`), 'MMM yyyy');
  } catch {
    return monthStr;
  }
}

export function getToday() {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Normalize any date string to yyyy-MM-dd for consistent storage and lookup */
export function normalizeDate(date) {
  if (!date) return '';
  const str = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  try {
    const parsed = parseISO(str);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    // fall through
  }
  return str.slice(0, 10);
}

export function getMonthFromDate(date) {
  return normalizeDate(date).slice(0, 7);
}

export function getCurrentMonth() {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthKey(date = new Date()) {
  return format(date, 'yyyy-MM');
}

export function getLastNMonths(n = 6) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  return months;
}

export function getDaysInMonth(monthStr) {
  const start = startOfMonth(parseISO(`${monthStr}-01`));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

export function isCurrentMonth(monthStr) {
  return monthStr === getCurrentMonth();
}

export { format, parseISO, isSameMonth };
