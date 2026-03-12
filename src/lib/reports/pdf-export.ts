/**
 * Mayas ERP - PDF Export
 * تصدير PDF
 */

import jsPDF from 'jspdf';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  data: any[];
  columns: { header: string; key: string; width: number }[];
  orientation?: 'portrait' | 'landscape';
}

/**
 * تصدير تقرير كـ PDF
 */
export function exportToPDF(options: PDFExportOptions): Buffer {
  const { title, subtitle, data, columns, orientation = 'portrait' } = options;

  // إنشاء مستند PDF
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  // إضافة خط عربي (مطلوب خط يدعم العربية)
  // doc.addFont('path/to/arabic-font.ttf', 'Arabic', 'normal');

  // العنوان
  doc.setFontSize(18);
  doc.text(title, 105, 20, { align: 'center' });

  // العنوان الفرعي
  if (subtitle) {
    doc.setFontSize(12);
    doc.text(subtitle, 105, 28, { align: 'center' });
  }

  // التاريخ
  doc.setFontSize(10);
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}`, 105, 35, { align: 'center' });

  // الجدول
  let y = 45;
  const rowHeight = 8;
  const startX = 15;

  // رأس الجدول
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  columns.forEach((col, i) => {
    let x = startX;
    for (let j = 0; j < i; j++) {
      x += columns[j].width;
    }
    doc.rect(x, y, col.width, rowHeight);
    doc.text(col.header, x + col.width / 2, y + 5, { align: 'center' });
  });

  y += rowHeight;

  // البيانات
  doc.setFont('helvetica', 'normal');
  data.forEach((row) => {
    columns.forEach((col, i) => {
      let x = startX;
      for (let j = 0; j < i; j++) {
        x += columns[j].width;
      }
      doc.rect(x, y, col.width, rowHeight);
      const value = row[col.key]?.toString() || '';
      doc.text(value.substring(0, 30), x + 2, y + 5);
    });
    y += rowHeight;

    // صفحة جديدة إذا امتلأت
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  // إرجاع كـ Buffer
  return Buffer.from(doc.output('arraybuffer'));
}
