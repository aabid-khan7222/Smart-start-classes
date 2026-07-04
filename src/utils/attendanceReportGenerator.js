import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatMonth } from './dateHelpers';
import { ATTENDANCE_STATUS } from './constants';
import { getLogoForPdf, getDataUrlFormat } from './logoHelpers';

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
  doc.setFontSize(size * 1.1);
  doc.text('SSC', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
}

function buildReportId(student, month) {
  const seq = String(student?.id || '').slice(-5).toUpperCase();
  const year = month?.split('-')[0] || new Date().getFullYear();
  return `ATT/${year}/${seq}`;
}

export function getStudentMonthAttendanceStats(records) {
  const present = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
  const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
  const total = records.length;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  return { present, absent, total, percentage };
}

export function buildAttendanceReportFilename(student, month) {
  const name = (student?.studentName || 'student').replace(/[^a-zA-Z0-9]/g, '_');
  return `Attendance_${name}_${month}.pdf`;
}

function drawHeader(doc, pageWidth, margin, settings, month, reportId, logoDataUrl) {
  const headerH = 46;
  doc.setFillColor(...C.blueSoft);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  doc.setFillColor(...C.blue);
  doc.rect(0, headerH - 1.2, pageWidth, 1.2, 'F');

  const logoSize = 22;
  const logoX = margin;
  const logoY = 12;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, getDataUrlFormat(logoDataUrl), logoX, logoY, logoSize, logoSize);
  } else {
    drawFallbackLogo(doc, logoX, logoY, logoSize);
  }

  const textX = logoX + logoSize + 8;
  const institute = settings?.className || 'Smart Start Classes';

  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(institute, textX, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  let infoY = 26;
  if (settings?.address) {
    doc.text(settings.address, textX, infoY);
    infoY += 4;
  }
  if (settings?.contact) {
    doc.text(`Tel: ${settings.contact}`, textX, infoY);
  }

  const rightX = pageWidth - margin;
  doc.setFillColor(...C.white);
  doc.roundedRect(rightX - 52, 11, 52, 24, 2, 2, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightX - 52, 11, 52, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.navy);
  doc.text('ATTENDANCE REPORT', rightX - 26, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.sub);
  doc.text(formatMonth(month), rightX - 26, 23, { align: 'center' });
  doc.text(reportId, rightX - 26, 28, { align: 'center' });

  return headerH + 10;
}

function drawMetricBox(doc, x, y, w, h, label, value, accent) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(...accent);
  doc.rect(x, y + 2, w, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.text);
  doc.text(String(value), x + w / 2, y + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), x + w / 2, y + 17.5, { align: 'center' });
}

function sectionTitle(doc, margin, y, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.text(title, margin, y);
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 28, y + 2);
  return y + 8;
}

export async function generateStudentAttendancePDF(student, records, month, settings) {
  if (!student) throw new Error('Student is required');

  const logoDataUrl = await loadLogoDataUrl(settings);
  const stats = getStudentMonthAttendanceStats(records);
  const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const reportId = buildReportId(student, month);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

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
    styles: { fontSize: 8.5, cellPadding: 3.2, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: C.sub },
      1: { cellWidth: 'auto' },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  const boxW = (pageWidth - margin * 2 - 9) / 4;
  const boxH = 20;
  drawMetricBox(doc, margin, y, boxW, boxH, 'Present', stats.present, C.green);
  drawMetricBox(doc, margin + boxW + 3, y, boxW, boxH, 'Absent', stats.absent, C.red);
  drawMetricBox(doc, margin + (boxW + 3) * 2, y, boxW, boxH, 'Total Days', stats.total, C.blue);
  drawMetricBox(
    doc,
    margin + (boxW + 3) * 3,
    y,
    boxW,
    boxH,
    'Attendance',
    `${stats.percentage.toFixed(1)}%`,
    stats.percentage >= 75 ? C.green : stats.percentage >= 50 ? [217, 119, 6] : C.red
  );

  y += boxH + 12;
  y = sectionTitle(doc, margin, y, 'Daily Records');

  if (sortedRecords.length === 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['#', 'Date', 'Day', 'Status', 'Reason']],
      body: [['—', '—', '—', 'No records for this month', '—']],
      styles: { fontSize: 8.5, cellPadding: 3.2, lineColor: C.border },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    });
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      head: [['#', 'Date', 'Day', 'Status', 'Reason']],
      body: sortedRecords.map((record, index) => {
        const isPresent = record.status === ATTENDANCE_STATUS.PRESENT;
        return [
          String(index + 1).padStart(2, '0'),
          formatDate(record.date),
          new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short' }),
          isPresent ? 'Present' : 'Absent',
          isPresent ? '—' : (record.reason || '—'),
        ];
      }),
      styles: { fontSize: 8.5, cellPadding: 3.5, textColor: C.text, lineColor: C.border, lineWidth: 0.15 },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 34 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 26 },
        4: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = data.cell.raw === 'Present' ? C.green : C.red;
        }
      },
    });
  }

  const footerY = doc.lastAutoTable.finalY + 12;
  doc.setDrawColor(...C.border);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
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

export async function downloadStudentAttendancePDF(student, records, month, settings) {
  const { blob, filename } = await generateStudentAttendancePDF(student, records, month, settings);
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
