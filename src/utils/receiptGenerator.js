import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMonth, formatDate } from './dateHelpers';
import { getDataUrlFormat } from './logoHelpers';

const COLORS = {
  primary: [27, 42, 74],
  primaryLight: [30, 58, 95],
  accent: [37, 99, 235],
  green: [22, 163, 74],
  red: [220, 38, 38],
  slate: [100, 116, 139],
  dark: [15, 23, 42],
  border: [203, 213, 225],
  boxBg: [248, 250, 252],
  white: [255, 255, 255],
};

function formatPdfCurrency(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
}

function formatPdfNumber(amount) {
  return Number(amount || 0).toLocaleString('en-IN');
}

function safeText(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function getAcademicYear(monthStr) {
  if (!monthStr) return '—';
  const [year, month] = monthStr.split('-').map(Number);
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

function buildReceiptNo(payment) {
  const year = payment.paymentMonth?.split('-')[0] || new Date().getFullYear();
  const seq = String(payment.id).slice(-5).toUpperCase();
  return `RCPT-${year}-${seq}`;
}

function getInstituteInitials(name) {
  return (name || 'SSC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function getPaymentReceiptData(payment, student, allPayments, settings) {
  const month = payment.paymentMonth;
  const monthlyFee = Number(student?.monthlyFees) || 0;

  const monthPayments = allPayments
    .filter((p) => p.studentId === payment.studentId && p.paymentMonth === month)
    .sort((a, b) => {
      const dateCmp = new Date(a.paymentDate) - new Date(b.paymentDate);
      if (dateCmp !== 0) return dateCmp;
      return String(a.id).localeCompare(String(b.id));
    });

  const paymentIndex = monthPayments.findIndex((p) => p.id === payment.id);
  const paymentsBefore = paymentIndex >= 0 ? monthPayments.slice(0, paymentIndex) : [];
  const paidBefore = paymentsBefore.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const thisAmount = Number(payment.amountPaid) || 0;
  const totalPaid = paidBefore + thisAmount;
  const remaining = Math.max(0, monthlyFee - totalPaid);

  let paymentStatus = 'Paid';
  if (totalPaid < monthlyFee && totalPaid > 0) paymentStatus = 'Partial';
  else if (totalPaid === 0) paymentStatus = 'Pending';

  return {
    receiptNo: buildReceiptNo(payment),
    paymentDate: payment.paymentDate,
    paymentMonth: month,
    paymentMonthLabel: formatMonth(month),
    academicYear: getAcademicYear(month),
    paymentMode: payment.paymentMode || '—',
    remarks: payment.remarks || '—',
    institute: {
      name: settings?.className || 'Smart Start Classes',
      contact: settings?.contact || '',
      address: settings?.address || '',
      initials: getInstituteInitials(settings?.className || 'Smart Start Classes'),
    },
    student: {
      name: safeText(student?.studentName),
      fatherName: safeText(student?.fatherName),
      motherName: safeText(student?.motherName),
      mobile: safeText(student?.mobileNumber),
      alternate: safeText(student?.alternateNumber),
      standard: safeText(student?.standard),
      batch: safeText(student?.batchTiming),
      school: safeText(student?.schoolName),
      address: safeText(student?.address),
    },
    fees: {
      monthlyFee,
      paidBefore,
      thisAmount,
      totalPaid,
      remaining,
      paymentStatus,
    },
  };
}

export function buildReceiptFilename(student, payment) {
  const name = (student?.studentName || 'student').replace(/[^a-zA-Z0-9]/g, '_');
  return `Receipt_${name}_${payment.paymentMonth}_${String(payment.id).slice(-6)}.pdf`;
}

function drawLogoBadge(doc, x, y, initials) {
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(x, y, 18, 18, 3, 3, 'F');
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(x + 1.5, y + 1.5, 15, 15, 2.5, 2.5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(initials, x + 9, y + 11, { align: 'center' });
}

function drawInstituteLogo(doc, x, y, size, logoDataUrl, initials) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, getDataUrlFormat(logoDataUrl), x, y, size, size);
      return;
    } catch {
      // Fall back to initials badge if image cannot be rendered
    }
  }
  drawLogoBadge(doc, x, y, initials);
}

function drawInfoBox(doc, x, y, width, title, rows) {
  const rowHeight = 10;
  const height = 14 + rows.length * rowHeight;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.boxBg);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text(title.toUpperCase(), x + 4, y + 6);

  let rowY = y + 13;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slate);
    doc.text(label, x + 4, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);
    const valueStr = String(value);
    const maxWidth = width - 8;
    const lines = doc.splitTextToSize(valueStr, maxWidth);
    doc.text(lines[0], x + 4, rowY + 4.5);
    rowY += rowHeight;
  });

  return y + height;
}

function drawSummaryBox(doc, x, y, width, title, items, highlightLast = false) {
  const height = 22 + items.length * 9;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.boxBg);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text(title.toUpperCase(), x + 4, y + 6);

  let rowY = y + 14;
  items.forEach(([label, value, color], index) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate);
    doc.text(label, x + 4, rowY);

    const isHighlight = highlightLast && index === items.length - 1;
    doc.setFont('helvetica', isHighlight ? 'bold' : 'bold');
    doc.setFontSize(isHighlight ? 10 : 8.5);
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(...COLORS.dark);
    doc.text(String(value), x + width - 4, rowY, { align: 'right' });
    rowY += 9;
  });

  return y + height;
}

function drawBottomSummaryBar(doc, pageWidth, y, data) {
  const margin = 14;
  const barWidth = pageWidth - margin * 2;
  const colWidth = barWidth / 4;
  const barHeight = 16;

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, barWidth, barHeight, 2, 2, 'F');

  const labels = ['Monthly Fee', 'Paid This Receipt', 'Total Paid', 'Total Pending'];
  const values = [
    formatPdfCurrency(data.fees.monthlyFee),
    formatPdfCurrency(data.fees.thisAmount),
    formatPdfCurrency(data.fees.totalPaid),
    formatPdfCurrency(data.fees.remaining),
  ];
  const valueColors = [COLORS.white, COLORS.white, [134, 239, 172], data.fees.remaining > 0 ? [252, 165, 165] : [134, 239, 172]];

  labels.forEach((label, i) => {
    const cx = margin + colWidth * i + colWidth / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(190, 210, 240);
    doc.text(label, cx, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...valueColors[i]);
    doc.text(values[i], cx, y + 12, { align: 'center' });
  });

  return y + barHeight;
}

const tableHeadStyle = {
  fillColor: COLORS.primaryLight,
  textColor: COLORS.white,
  fontStyle: 'bold',
  fontSize: 7,
  halign: 'center',
  cellPadding: 2.5,
};

const tableBodyStyle = {
  fontSize: 7.5,
  cellPadding: 2.8,
  textColor: COLORS.dark,
  lineColor: COLORS.border,
  lineWidth: 0.2,
};

export function generateReceiptPDF(payment, student, allPayments, settings) {
  if (!payment || !student) {
    throw new Error('Payment and student are required to generate receipt');
  }

  const data = getPaymentReceiptData(payment, student, allPayments, settings);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  drawInstituteLogo(doc, margin, y, 18, settings?.logo, data.institute.initials);

  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.institute.name, margin + 22, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate);
  let infoY = y + 11;
  if (data.institute.address) {
    doc.text(data.institute.address, margin + 22, infoY);
    infoY += 4;
  }
  if (data.institute.contact) {
    doc.text(`Phone: ${data.institute.contact}`, margin + 22, infoY);
    infoY += 4;
  }

  y = Math.max(y + 22, infoY + 2);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text('FEE RECEIPT', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate);
  doc.text(`Fee Month: ${data.paymentMonthLabel}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Academic Year: ${data.academicYear}`, pageWidth - margin, y + 4.5, { align: 'right' });

  y += 10;

  const boxWidth = (pageWidth - margin * 2 - 6) / 2;
  const boxLeft = margin;
  const boxRight = margin + boxWidth + 6;

  const leftBoxEnd = drawInfoBox(doc, boxLeft, y, boxWidth, 'Receipt Information', [
    ['Receipt No.', data.receiptNo],
    ['Payment Date', formatDate(data.paymentDate)],
    ['Payment Mode', data.paymentMode],
    ['Payment Status', data.fees.paymentStatus],
  ]);

  const rightBoxEnd = drawInfoBox(doc, boxRight, y, boxWidth, 'Student Information', [
    ['Student Name', data.student.name],
    ['Father Name', data.student.fatherName],
    ['Class / Standard', data.student.standard],
    ['Batch Timing', data.student.batch],
    ['Mobile Number', data.student.mobile],
    ['School Name', data.student.school],
  ]);

  y = Math.max(leftBoxEnd, rightBoxEnd) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text('FEES PAID (THIS RECEIPT)', margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Fee Type', 'Month', 'Monthly Fee', 'Paid Before', 'Paid Now', 'Total Paid', 'Pending']],
    body: [[
      '1',
      'Tuition Fee',
      data.paymentMonthLabel,
      formatPdfNumber(data.fees.monthlyFee),
      formatPdfNumber(data.fees.paidBefore),
      formatPdfNumber(data.fees.thisAmount),
      formatPdfNumber(data.fees.totalPaid),
      formatPdfNumber(data.fees.remaining),
    ]],
    theme: 'grid',
    headStyles: tableHeadStyle,
    styles: tableBodyStyle,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: COLORS.green },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', fontStyle: 'bold', textColor: data.fees.remaining > 0 ? COLORS.red : COLORS.green },
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
  });

  y = doc.lastAutoTable.finalY + 8;

  const summaryWidth = (pageWidth - margin * 2 - 6) / 2;

  const leftSummaryEnd = drawSummaryBox(
    doc,
    boxLeft,
    y,
    summaryWidth,
    'Payment Summary (This Receipt)',
    [
      ['Monthly Fee', formatPdfCurrency(data.fees.monthlyFee)],
      ['Previously Paid', formatPdfCurrency(data.fees.paidBefore)],
      ['Paid This Receipt', formatPdfCurrency(data.fees.thisAmount), COLORS.green],
      ['Payment Status', data.fees.paymentStatus, data.fees.paymentStatus === 'Paid' ? COLORS.green : data.fees.paymentStatus === 'Partial' ? COLORS.accent : COLORS.red],
    ]
  );

  const rightSummaryEnd = drawSummaryBox(
    doc,
    boxRight,
    y,
    summaryWidth,
    'Account Summary (This Month)',
    [
      ['Monthly Fee', formatPdfCurrency(data.fees.monthlyFee)],
      ['Total Paid', formatPdfCurrency(data.fees.totalPaid), COLORS.green],
      ['Total Pending', formatPdfCurrency(data.fees.remaining), data.fees.remaining > 0 ? COLORS.red : COLORS.green],
    ],
    true
  );

  y = Math.max(leftSummaryEnd, rightSummaryEnd) + 8;

  if (data.remarks && data.remarks !== '—') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate);
    doc.text(`Remarks: ${data.remarks}`, margin, y);
    y += 6;
  }

  y = drawBottomSummaryBar(doc, pageWidth, y, data);

  y += 12;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate);
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.accent);
  doc.text('Thank you for your payment!', pageWidth / 2, y, { align: 'center' });

  const blob = doc.output('blob');
  const filename = buildReceiptFilename(student, payment);
  return { blob, filename, data };
}

export function viewReceipt(blob) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  if (!opened) {
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export function downloadReceipt(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openAndDownloadReceipt(payment, student, allPayments, settings) {
  const { blob, filename } = generateReceiptPDF(payment, student, allPayments, settings);
  downloadReceipt(blob, filename);
  viewReceipt(blob);
  return { blob, filename };
}
