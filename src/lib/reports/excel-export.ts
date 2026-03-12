/**
 * Mayas ERP - Excel Export
 * تصدير Excel
 */

import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  title: string;
  data: any[];
  columns: { header: string; key: string }[];
  sheetName?: string;
}

/**
 * تصدير بيانات كـ Excel
 */
export function exportToExcel(options: ExcelExportOptions): Buffer {
  const { title, data, columns, sheetName = 'Sheet1' } = options;

  // تحويل البيانات
  const rows = data.map((row) => {
    const obj: any = {};
    columns.forEach((col) => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  // إنشاء ورقة العمل
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // تعيين عرض الأعمدة
  const columnWidths = columns.map((col) => ({
    wch: Math.max(col.header.length, 15),
  }));
  worksheet['!cols'] = columnWidths;

  // إنشاء المصنف
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // إرجاع كـ Buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

/**
 * تصدير تقارير متعددة في ملف واحد
 */
export function exportMultipleSheets(
  reports: { title: string; data: any[]; columns: { header: string; key: string }[] }[]
): Buffer {
  const workbook = XLSX.utils.book_new();

  reports.forEach((report) => {
    const rows = report.data.map((row) => {
      const obj: any = {};
      report.columns.forEach((col) => {
        obj[col.header] = row[col.key] ?? '';
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, report.title.substring(0, 31));
  });

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}
