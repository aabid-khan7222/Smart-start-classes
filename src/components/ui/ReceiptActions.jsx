import { Eye, Download } from 'lucide-react';
import { generateReceiptPDF, viewReceipt, downloadReceipt } from '../../utils/receiptGenerator';

export default function ReceiptActions({ payment, student, payments, settings, size = 'sm' }) {
  if (!payment || !student) return null;

  const iconSize = size === 'sm' ? 15 : 17;
  const btnClass =
    size === 'sm'
      ? 'p-2 rounded-lg bg-slate-100 text-slate-600 active:bg-slate-200'
      : 'p-2.5 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200';

  const handleView = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { blob } = generateReceiptPDF(payment, student, payments, settings);
      viewReceipt(blob);
    } catch (err) {
      console.error('Failed to view receipt:', err);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { blob, filename } = generateReceiptPDF(payment, student, payments, settings);
      downloadReceipt(blob, filename);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleView}
        className={btnClass}
        title="View Receipt"
        aria-label="View receipt"
      >
        <Eye size={iconSize} />
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className={btnClass}
        title="Download Receipt"
        aria-label="Download receipt"
      >
        <Download size={iconSize} />
      </button>
    </div>
  );
}
