import { jsPDF } from 'jspdf';

/**
 * Mobile-first PDF layout.
 *
 * A4 (210 mm) pages are scaled down ~50% on phone PDF viewers, which makes
 * 7–8 pt text unreadable. A ~105 mm page width maps closely to a phone screen
 * at 100% zoom, so content renders at the intended size without shrinking.
 */
export const MOBILE_PDF = {
  width: 105,
  margin: 8,
  gap: 6,
  logoSize: 20,
  fonts: {
    institute: 14,
    title: 15,
    section: 10,
    boxTitle: 9,
    label: 9,
    value: 10,
    tableHead: 9,
    tableBody: 9.5,
    summaryHighlight: 12,
    footer: 9,
    footerBold: 10,
  },
};

export function getContentWidth(layout = MOBILE_PDF) {
  return layout.width - layout.margin * 2;
}

export function createMobilePdf(pageHeight = 360) {
  return new jsPDF({
    unit: 'mm',
    format: [MOBILE_PDF.width, pageHeight],
    orientation: 'portrait',
  });
}

export function getPageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}
