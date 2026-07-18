import { normalizeDate, getMonthFromDate } from './dateHelpers';
import { HOLIDAY_TYPES } from './constants';

export function normalizeHolidayType(type) {
  if (type === HOLIDAY_TYPES.PERSONAL) return HOLIDAY_TYPES.PERSONAL;
  return HOLIDAY_TYPES.PUBLIC;
}

export function getHolidayForDate(holidays, date) {
  const normalized = normalizeDate(date);
  if (!normalized || !Array.isArray(holidays)) return null;
  return holidays.find((h) => normalizeDate(h.date) === normalized) || null;
}

export function isHoliday(holidays, date) {
  return Boolean(getHolidayForDate(holidays, date));
}

export function getHolidaysForMonth(holidays, monthStr) {
  if (!Array.isArray(holidays) || !monthStr) return [];
  return holidays
    .filter((h) => getMonthFromDate(h.date) === monthStr)
    .sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));
}

export function getHolidayTypeLabel(type) {
  return normalizeHolidayType(type) === HOLIDAY_TYPES.PERSONAL
    ? 'Personal / Tuition Closed'
    : 'Public Holiday';
}
