export const STANDARDS = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th'];

export const BATCH_TIMINGS = [
  '3pm to 4pm',
  '4pm to 5pm',
  '5pm to 6pm',
  '6pm to 7pm',
];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank'];

export const STUDENT_STATUS = ['Active', 'Inactive'];

export const FEE_STATUS = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
};

export const HOLIDAY_TYPES = {
  PUBLIC: 'public',
  PERSONAL: 'personal',
};

export const HOLIDAY_TYPE_OPTIONS = [
  { value: HOLIDAY_TYPES.PUBLIC, label: 'Public Holiday' },
  { value: HOLIDAY_TYPES.PERSONAL, label: 'Personal / Tuition Closed' },
];

export const STORAGE_KEYS = {
  STUDENTS: 'smartstart_students',
  ATTENDANCE: 'smartstart_attendance',
  HOLIDAYS: 'smartstart_holidays',
  FEE_PAYMENTS: 'smartstart_fee_payments',
  SETTINGS: 'smartstart_settings',
  AUTH: 'smartstart_auth',
  SESSION: 'smartstart_session',
  REMEMBER_ME: 'smartstart_remember_me',
};

export const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'LayoutDashboard' },
  { path: '/students', label: 'Students', icon: 'Users' },
  { path: '/fees', label: 'Fees', icon: 'IndianRupee' },
  { path: '/attendance', label: 'Attendance', icon: 'CalendarCheck' },
  { path: '/reports', label: 'Reports', icon: 'BarChart3' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];
