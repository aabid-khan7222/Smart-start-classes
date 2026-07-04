import autoTable from 'jspdf-autotable';
import { formatMonth, formatDate } from './dateHelpers';
import { getDataUrlFormat } from './logoHelpers';
import { MOBILE_PDF, createMobilePdf, getContentWidth } from './pdfLayout';

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

function drawLogoBadge(doc, x, y, size, initials) {
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(x + 1.5, y + 1.5, size - 3, size - 3, 2.5, 2.5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.boxTitle);
  doc.text(initials, x + size / 2, y + size / 2 + 1.5, { align: 'center' });
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
  drawLogoBadge(doc, x, y, size, initials);
}

function drawInfoBox(doc, x, y, width, title, rows) {
  const rowHeight = 12;
  const height = 16 + rows.length * rowHeight;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.boxBg);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.boxTitle);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text(title.toUpperCase(), x + 4, y + 7);

  let rowY = y + 15;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(MOBILE_PDF.fonts.label);
    doc.setTextColor(...COLORS.slate);
    doc.text(label, x + 4, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(MOBILE_PDF.fonts.value);
    doc.setTextColor(...COLORS.dark);
    const valueStr = String(value);
    const maxWidth = width - 8;
    const lines = doc.splitTextToSize(valueStr, maxWidth);
    doc.text(lines[0], x + 4, rowY + 5);
    rowY += rowHeight;
  });

  return y + height;
}

function drawSummaryBox(doc, x, y, width, title, items, highlightLast = false) {
  const height = 24 + items.length * 11;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.boxBg);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.boxTitle);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text(title.toUpperCase(), x + 4, y + 7);

  let rowY = y + 16;
  items.forEach(([label, value, color], index) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(MOBILE_PDF.fonts.label);
    doc.setTextColor(...COLORS.slate);
    doc.text(label, x + 4, rowY);

    const isHighlight = highlightLast && index === items.length - 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isHighlight ? MOBILE_PDF.fonts.summaryHighlight : MOBILE_PDF.fonts.value);
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(...COLORS.dark);
    doc.text(String(value), x + width - 4, rowY, { align: 'right' });
    rowY += 11;
  });

  return y + height;
}

function drawBottomSummaryBar(doc, margin, pageWidth, y, data) {
  const barWidth = pageWidth - margin * 2;
  const colWidth = barWidth / 2;
  const rowHeight = 18;
  const barHeight = rowHeight * 2;

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, barWidth, barHeight, 2, 2, 'F');

  const items = [
    { label: 'Monthly Fee', value: formatPdfCurrency(data.fees.monthlyFee), color: COLORS.white },
    { label: 'Paid This Receipt', value: formatPdfCurrency(data.fees.thisAmount), color: COLORS.white },
    { label: 'Total Paid', value: formatPdfCurrency(data.fees.totalPaid), color: [134, 239, 172] },
    {
      label: 'Total Pending',
      value: formatPdfCurrency(data.fees.remaining),
      color: data.fees.remaining > 0 ? [252, 165, 165] : [134, 239, 172],
    },
  ];

  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = margin + colWidth * col + colWidth / 2;
    const cellY = y + row * rowHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(MOBILE_PDF.fonts.label);
    doc.setTextColor(190, 210, 240);
    doc.text(item.label, cx, cellY + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(MOBILE_PDF.fonts.footerBold);
    doc.setTextColor(...item.color);
    doc.text(item.value, cx, cellY + 13, { align: 'center' });
  });

  return y + barHeight;
}

const tableHeadStyle = {
  fillColor: COLORS.primaryLight,
  textColor: COLORS.white,
  fontStyle: 'bold',
  fontSize: MOBILE_PDF.fonts.tableHead,
  halign: 'left',
  cellPadding: 3,
};

const tableBodyStyle = {
  fontSize: MOBILE_PDF.fonts.tableBody,
  cellPadding: 3.2,
  textColor: COLORS.dark,
  lineColor: COLORS.border,
  lineWidth: 0.2,
};

export function generateReceiptPDF(payment, student, allPayments, settings) {
  if (!payment || !student) {
    throw new Error('Payment and student are required to generate receipt');
  }

  const data = getPaymentReceiptData(payment, student, allPayments, settings);
  const doc = createMobilePdf(380);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = MOBILE_PDF.margin;
  const contentWidth = getContentWidth();
  let y = margin;

  drawInstituteLogo(doc, margin, y, MOBILE_PDF.logoSize, settings?.logo, data.institute.initials);

  const textX = margin + MOBILE_PDF.logoSize + 5;
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.institute);
  doc.text(data.institute.name, textX, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.label);
  doc.setTextColor(...COLORS.slate);
  let infoY = y + 13;
  if (data.institute.address) {
    const addressLines = doc.splitTextToSize(data.institute.address, contentWidth - MOBILE_PDF.logoSize - 5);
    doc.text(addressLines, textX, infoY);
    infoY += addressLines.length * 4.5;
  }
  if (data.institute.contact) {
    doc.text(`Phone: ${data.institute.contact}`, textX, infoY);
    infoY += 4.5;
  }

  y = Math.max(y + MOBILE_PDF.logoSize + 2, infoY + 2);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += MOBILE_PDF.gap;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.title);
  doc.setTextColor(...COLORS.primary);
  doc.text('FEE RECEIPT', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.label);
  doc.setTextColor(...COLORS.slate);
  doc.text(`Fee Month: ${data.paymentMonthLabel}`, margin, y + 6);
  doc.text(`Academic Year: ${data.academicYear}`, margin, y + 11);

  y += 18;

  y = drawInfoBox(doc, margin, y, contentWidth, 'Receipt Information', [
    ['Receipt No.', data.receiptNo],
    ['Payment Date', formatDate(data.paymentDate)],
    ['Payment Mode', data.paymentMode],
    ['Payment Status', data.fees.paymentStatus],
  ]) + MOBILE_PDF.gap;

  y = drawInfoBox(doc, margin, y, contentWidth, 'Student Information', [
    ['Student Name', data.student.name],
    ['Father Name', data.student.fatherName],
    ['Class / Standard', data.student.standard],
    ['Batch Timing', data.student.batch],
    ['Mobile Number', data.student.mobile],
    ['School Name', data.student.school],
  ]) + MOBILE_PDF.gap;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.section);
  doc.setTextColor(...COLORS.primaryLight);
  doc.text('FEES PAID (THIS RECEIPT)', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Amount']],
    body: [
      ['Fee Type', 'Tuition Fee'],
      ['Month', data.paymentMonthLabel],
      ['Monthly Fee', formatPdfNumber(data.fees.monthlyFee)],
      ['Paid Before', formatPdfNumber(data.fees.paidBefore)],
      ['Paid Now', formatPdfNumber(data.fees.thisAmount)],
      ['Total Paid', formatPdfNumber(data.fees.totalPaid)],
      ['Pending', formatPdfNumber(data.fees.remaining)],
    ],
    theme: 'grid',
    headStyles: tableHeadStyle,
    styles: tableBodyStyle,
    columnStyles: {
      0: { cellWidth: contentWidth * 0.45, fontStyle: 'bold', textColor: COLORS.slate },
      1: { halign: 'right', cellWidth: contentWidth * 0.55 },
    },
    didParseCell: (cellData) => {
      if (cellData.section !== 'body') return;
      const label = cellData.row.raw[0];
      if (label === 'Paid Now') {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.textColor = COLORS.green;
      }
      if (label === 'Pending') {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.textColor = data.fees.remaining > 0 ? COLORS.red : COLORS.green;
      }
      if (label === 'Total Paid') {
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
  });

  y = doc.lastAutoTable.finalY + MOBILE_PDF.gap;

  y = drawSummaryBox(
    doc,
    margin,
    y,
    contentWidth,
    'Payment Summary (This Receipt)',
    [
      ['Monthly Fee', formatPdfCurrency(data.fees.monthlyFee)],
      ['Previously Paid', formatPdfCurrency(data.fees.paidBefore)],
      ['Paid This Receipt', formatPdfCurrency(data.fees.thisAmount), COLORS.green],
      [
        'Payment Status',
        data.fees.paymentStatus,
        data.fees.paymentStatus === 'Paid'
          ? COLORS.green
          : data.fees.paymentStatus === 'Partial'
            ? COLORS.accent
            : COLORS.red,
      ],
    ]
  ) + MOBILE_PDF.gap;

  y = drawSummaryBox(
    doc,
    margin,
    y,
    contentWidth,
    'Account Summary (This Month)',
    [
      ['Monthly Fee', formatPdfCurrency(data.fees.monthlyFee)],
      ['Total Paid', formatPdfCurrency(data.fees.totalPaid), COLORS.green],
      ['Total Pending', formatPdfCurrency(data.fees.remaining), data.fees.remaining > 0 ? COLORS.red : COLORS.green],
    ],
    true
  ) + MOBILE_PDF.gap;

  if (data.remarks && data.remarks !== '—') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(MOBILE_PDF.fonts.label);
    doc.setTextColor(...COLORS.slate);
    const remarkLines = doc.splitTextToSize(`Remarks: ${data.remarks}`, contentWidth);
    doc.text(remarkLines, margin, y);
    y += remarkLines.length * 4.5 + 2;
  }

  y = drawBottomSummaryBar(doc, margin, pageWidth, y, data);

  y += MOBILE_PDF.gap + 4;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(MOBILE_PDF.fonts.footer);
  doc.setTextColor(...COLORS.slate);
  doc.text(
    'This is a computer-generated receipt and does not require a signature.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MOBILE_PDF.fonts.footerBold);
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
