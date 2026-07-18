import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { formatDate, formatMonth, getDaysInMonth, normalizeDate } from './dateHelpers';
import { ATTENDANCE_STATUS } from './constants';
import { getLogoForPdf, getDataUrlFormat } from './logoHelpers';
import { MOBILE_PDF, createMobilePdf, getContentWidth } from './pdfLayout';
import { getHolidayForDate } from './holidayHelpers';
import { isPresentStatus, isAbsentStatus, isSameStudentId } from './attendanceHelpers';

const C = {
  navy: [30, 58, 138],
  blue: [37, 99, 235],
  blueSoft: [239, 246, 255],
  text: [15, 23, 42],
  sub: [71, 85, 105],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  head: [241, 245, 249],
  white: [255, 255, 255],
  green: [22, 163, 74],
  red: [220, 38, 38],
  amber: [217, 119, 6],
};

export const DAY_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HOLIDAY: 'holiday',
  NOT_ADDED: 'not_added',
};

const STATUS_LABEL = {
  [DAY_STATUS.PRESENT]: 'Present',
  [DAY_STATUS.ABSENT]: 'Absent',
  [DAY_STATUS.HOLIDAY]: 'Holiday',
  [DAY_STATUS.NOT_ADDED]: 'Attendance not added',
};

const STATUS_COLOR = {
  [DAY_STATUS.PRESENT]: C.green,
  [DAY_STATUS.ABSENT]: C.red,
  [DAY_STATUS.HOLIDAY]: C.amber,
  [DAY_STATUS.NOT_ADDED]: C.muted,
};

async function loadLogoDataUrl(settings) {
  return getLogoForPdf(settings);
}

function drawFallbackLogo(doc, x, y, size) {
  doc.setFillColor(...C.navy);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setFillColor(...C.blue);
  doc.roundedRect(x + 1.2, y + 1.2, size - 2.4, size - 2.4, 2.5, 2.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.boxTitle);
  doc.text('SSC', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
}

function buildReportId(student, month) {
  const seq = String(student?.id || '').slice(-5).toUpperCase();
  const year = month?.split('-')[0] || new Date().getFullYear();
  return `ATT/${year}/${seq}`;
}

function getWeekdayShort(dateStr) {
  try {
    return format(parseISO(normalizeDate(dateStr)), 'EEE');
  } catch {
    return '—';
  }
}

/**
 * Build one row per calendar day in the month.
 * Priority: Holiday > Present/Absent > Attendance not added
 */
export function buildFullMonthAttendanceRows(month, records = [], holidays = [], studentId = null) {
  const days = getDaysInMonth(month);
  const studentRecords = (records || []).filter(
    (r) => !studentId || isSameStudentId(r.studentId, studentId)
  );

  const byDate = new Map();
  studentRecords.forEach((r) => {
    const key = normalizeDate(r.date);
    if (key) byDate.set(key, r);
  });

  return days.map((date) => {
    const holiday = getHolidayForDate(holidays, date);
    if (holiday) {
      return {
        date,
        status: DAY_STATUS.HOLIDAY,
        label: STATUS_LABEL[DAY_STATUS.HOLIDAY],
        reason: holiday.reason || '—',
      };
    }

    const record = byDate.get(date);
    if (record && isPresentStatus(record.status)) {
      return {
        date,
        status: DAY_STATUS.PRESENT,
        label: STATUS_LABEL[DAY_STATUS.PRESENT],
        reason: '—',
      };
    }
    if (record && isAbsentStatus(record.status)) {
      return {
        date,
        status: DAY_STATUS.ABSENT,
        label: STATUS_LABEL[DAY_STATUS.ABSENT],
        reason: record.reason || '—',
      };
    }

    return {
      date,
      status: DAY_STATUS.NOT_ADDED,
      label: STATUS_LABEL[DAY_STATUS.NOT_ADDED],
      reason: '—',
    };
  });
}

export function getStudentMonthAttendanceStats(rowsOrRecords) {
  const rows = Array.isArray(rowsOrRecords) ? rowsOrRecords : [];

  // Full-month rows (have .label / DAY_STATUS)
  if (rows.some((r) => r.status === DAY_STATUS.HOLIDAY || r.status === DAY_STATUS.NOT_ADDED || r.label)) {
    const present = rows.filter((r) => r.status === DAY_STATUS.PRESENT).length;
    const absent = rows.filter((r) => r.status === DAY_STATUS.ABSENT).length;
    const holiday = rows.filter((r) => r.status === DAY_STATUS.HOLIDAY).length;
    const notAdded = rows.filter((r) => r.status === DAY_STATUS.NOT_ADDED).length;
    const marked = present + absent;
    const percentage = marked > 0 ? (present / marked) * 100 : 0;
    return {
      present,
      absent,
      holiday,
      notAdded,
      total: rows.length,
      marked,
      percentage,
    };
  }

  // Legacy: raw attendance records only
  const present = rows.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT || isPresentStatus(r.status)).length;
  const absent = rows.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT || isAbsentStatus(r.status)).length;
  const total = rows.length;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  return { present, absent, holiday: 0, notAdded: 0, total, marked: total, percentage };
}

export function buildAttendanceReportFilename(student, month) {
  const name = (student?.studentName || 'student').replace(/[^a-zA-Z0-9]/g, '_');
  return `Attendance_${name}_${month}.pdf`;
}

function drawHeader(doc, pageWidth, margin, settings, month, reportId, logoDataUrl) {
  const logoSize = MOBILE_PDF.logoSize;
  const headerH = 52;
  doc.setFillColor(...C.blueSoft);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  doc.setFillColor(...C.blue);
  doc.rect(0, headerH - 1.2, pageWidth, 1.2, 'F');

  const logoX = margin;
  const logoY = 10;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, getDataUrlFormat(logoDataUrl), logoX, logoY, logoSize, logoSize);
  } else {
    drawFallbackLogo(doc, logoX, logoY, logoSize);
  }

  const textX = logoX + logoSize + 5;
  const institute = settings?.className || 'Smart Start Classes';

  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.institute);
  doc.text(institute, textX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.label);
  doc.setTextColor(...C.muted);
  let infoY = 24;
  const contentWidth = getContentWidth();
  if (settings?.address) {
    const lines = doc.splitTextToSize(settings.address, contentWidth - logoSize - 5);
    doc.text(lines, textX, infoY);
    infoY += lines.length * 4.5;
  }
  if (settings?.contact) {
    doc.text(`Tel: ${settings.contact}`, textX, infoY);
  }

  const badgeY = headerH - 14;
  doc.setFillColor(...C.white);
  doc.roundedRect(margin, badgeY, contentWidth, 12, 2, 2, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, badgeY, contentWidth, 12, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.section);
  doc.setTextColor(...C.navy);
  doc.text('ATTENDANCE REPORT', pageWidth / 2, badgeY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.label);
  doc.setTextColor(...C.sub);
  doc.text(`${formatMonth(month)}  ·  ${reportId}`, pageWidth / 2, badgeY + 9.5, { align: 'center' });

  return headerH + 8;
}

function drawMetricBox(doc, x, y, w, h, label, value, accent) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(...accent);
  doc.rect(x, y + 2, w, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.summaryHighlight);
  doc.setTextColor(...C.text);
  doc.text(String(value), x + w / 2, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.label);
  doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), x + w / 2, y + 19, { align: 'center' });
}

function sectionTitle(doc, margin, y, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.section);
  doc.setTextColor(...C.navy);
  doc.text(title, margin, y);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 28, y + 2);
  return y + 8;
}

function drawMetricGrid(doc, margin, y, stats) {
  const contentWidth = getContentWidth();
  const gap = 3.5;
  const boxW = (contentWidth - gap) / 2;
  const boxH = 22;

  drawMetricBox(doc, margin, y, boxW, boxH, 'Present', stats.present, C.green);
  drawMetricBox(doc, margin + boxW + gap, y, boxW, boxH, 'Absent', stats.absent, C.red);

  const row2Y = y + boxH + gap;
  drawMetricBox(doc, margin, row2Y, boxW, boxH, 'Holiday', stats.holiday, C.amber);
  drawMetricBox(doc, margin + boxW + gap, row2Y, boxW, boxH, 'Not Added', stats.notAdded, C.muted);

  const row3Y = row2Y + boxH + gap;
  drawMetricBox(doc, margin, row3Y, boxW, boxH, 'Month Days', stats.total, C.blue);
  drawMetricBox(
    doc,
    margin + boxW + gap,
    row3Y,
    boxW,
    boxH,
    'Attendance',
    `${stats.percentage.toFixed(1)}%`,
    stats.percentage >= 75 ? C.green : stats.percentage >= 50 ? C.amber : C.red
  );

  return row3Y + boxH;
}

export async function generateStudentAttendancePDF(
  student,
  records,
  month,
  settings,
  holidays = []
) {
  if (!student) throw new Error('Student is required');

  const logoDataUrl = await loadLogoDataUrl(settings);
  const monthRows = buildFullMonthAttendanceRows(month, records, holidays, student.id);
  const stats = getStudentMonthAttendanceStats(monthRows);
  const reportId = buildReportId(student, month);

  // ~28–31 day tables need a taller first page; autoTable still adds pages if needed
  const doc = createMobilePdf(520);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = MOBILE_PDF.margin;
  const contentWidth = getContentWidth();

  let y = drawHeader(doc, pageWidth, margin, settings, month, reportId, logoDataUrl);

  y = sectionTitle(doc, margin, y, 'Student Details');

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Field', 'Information']],
    body: [
      ['Student Name', student.studentName || '—'],
      ['Class / Standard', student.standard || '—'],
      ['Batch Timing', student.batchTiming || '—'],
      ['Mobile Number', student.mobileNumber || '—'],
    ],
    styles: {
      fontSize: MOBILE_PDF.fonts.tableBody,
      cellPadding: 3.5,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: MOBILE_PDF.fonts.tableHead,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.38, fontStyle: 'bold', textColor: C.sub },
      1: { cellWidth: contentWidth * 0.62 },
    },
  });

  y = doc.lastAutoTable.finalY + MOBILE_PDF.gap;
  y = drawMetricGrid(doc, margin, y, stats) + MOBILE_PDF.gap;
  y = sectionTitle(doc, margin, y, 'Daily Records');

  const tableStyles = {
    fontSize: MOBILE_PDF.fonts.tableBody,
    cellPadding: 2.8,
    textColor: C.text,
    lineColor: C.border,
    lineWidth: 0.15,
  };

  const tableHeadStyles = {
    fillColor: C.navy,
    textColor: C.white,
    fontStyle: 'bold',
    fontSize: MOBILE_PDF.fonts.tableHead,
    halign: 'center',
  };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    head: [['#', 'Date', 'Day', 'Status', 'Reason']],
    body: monthRows.map((row, index) => [
      String(index + 1).padStart(2, '0'),
      formatDate(row.date),
      getWeekdayShort(row.date),
      row.label,
      row.reason || '—',
    ]),
    styles: tableStyles,
    headStyles: tableHeadStyles,
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { cellWidth: 22 },
      2: { halign: 'center', cellWidth: 12 },
      3: { cellWidth: 28 },
      4: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        const row = monthRows[data.row.index];
        data.cell.styles.textColor = STATUS_COLOR[row?.status] || C.muted;
        if (row?.status === DAY_STATUS.NOT_ADDED) {
          data.cell.styles.fontSize = 7.5;
        }
      }
    },
  });

  const footerY = doc.lastAutoTable.finalY + MOBILE_PDF.gap;
  doc.setDrawColor(...C.border);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.footer);
  doc.setTextColor(...C.muted);
  doc.text(
    `Generated on ${formatDate(new Date().toISOString().split('T')[0])}  ·  Computer-generated report`,
    pageWidth / 2,
    footerY + 6,
    { align: 'center' }
  );

  const blob = doc.output('blob');
  const filename = buildAttendanceReportFilename(student, month);
  return { blob, filename, stats };
}

export async function downloadStudentAttendancePDF(
  student,
  records,
  month,
  settings,
  holidays = []
) {
  const { blob, filename } = await generateStudentAttendancePDF(
    student,
    records,
    month,
    settings,
    holidays
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { blob, filename };
}
