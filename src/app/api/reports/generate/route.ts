/**
 * Mayas ERP - Reports API
 * API التقارير
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesReport, getInventoryReport, getTrialBalance } from '@/lib/reports/engine';
import { exportToExcel } from '@/lib/reports/excel-export';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // TODO: الحصول على معلومات المستخدم من الجلسة
    const companyId = '00000000-0000-0000-0000-000000000001';

    const params = {
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    let report;

    switch (type) {
      case 'sales':
        report = await getSalesReport(params);
        break;
      case 'inventory':
        report = await getInventoryReport(params);
        break;
      case 'trial-balance':
        report = await getTrialBalance(params);
        break;
      default:
        return NextResponse.json(
          { error: 'نوع التقرير غير صحيح' },
          { status: 400 }
        );
    }

    // تصدير كـ Excel
    if (format === 'excel') {
      const columns = type === 'sales' 
        ? [
            { header: 'رقم الفاتورة', key: 'invoiceNumber' },
            { header: 'التاريخ', key: 'invoiceDate' },
            { header: 'العميل', key: 'customer.nameAr' },
            { header: 'المبلغ', key: 'totalAmount' },
          ]
        : type === 'inventory'
        ? [
            { header: 'الصنف', key: 'item.nameAr' },
            { header: 'الكمية', key: 'quantity' },
            { header: 'المستودع', key: 'warehouse.nameAr' },
          ]
        : [
            { header: 'رقم الحساب', key: 'code' },
            { header: 'اسم الحساب', key: 'nameAr' },
            { header: 'مدين', key: 'debit' },
            { header: 'دائن', key: 'credit' },
          ];

      const buffer = exportToExcel({
        title: report.title,
        data: report.data,
        columns,
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${type}-report.xlsx"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء التقرير' },
      { status: 500 }
    );
  }
}
