/**
 * Mayas ERP - Reports Page
 * صفحة التقارير
 */

'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('sales');

  const categories = [
    { id: 'sales', label: 'المبيعات', icon: '💰' },
    { id: 'purchasing', label: 'المشتريات', icon: '🛍️' },
    { id: 'inventory', label: 'المخزون', icon: '📦' },
    { id: 'accounting', label: 'المحاسبة', icon: '📑' },
    { id: 'tax', label: 'الضرائب', icon: '🧾' },
    { id: 'customers', label: 'العملاء', icon: '👥' },
    { id: 'suppliers', label: 'الموردين', icon: '🏭' },
  ];

  const reports = {
    sales: [
      { id: 1, name: 'مبيعات اليوم', description: 'ملخص مبيعات اليوم' },
      { id: 2, name: 'مبيعات بالفرع', description: 'تفصيل المبيعات حسب الفرع' },
      { id: 3, name: 'أكثر الأصناف مبيعاً', description: 'أعلى 20 صنف مبيعاً' },
      { id: 4, name: 'تقرير العملاء', description: 'تحليل عملاء المبيعات' },
      { id: 5, name: 'هوامش الربح', description: 'تحليل هوامش الربح' },
    ],
    purchasing: [
      { id: 1, name: 'مشتريات اليوم', description: 'ملخص مشتريات اليوم' },
      { id: 2, name: 'حسب المورد', description: 'تفصيل المشتريات حسب المورد' },
      { id: 3, name: 'طلبات معلقة', description: 'أوامر الشراء المعلقة' },
    ],
    inventory: [
      { id: 1, name: 'رصيد المخزون', description: 'الرصيد الحالي' },
      { id: 2, name: 'الأصناف الناقصة', description: 'تحت حد إعادة الطلب' },
      { id: 3, name: 'الأصناف الراكدة', description: 'بدون حركة' },
      { id: 4, name: 'حركة المخزون', description: 'تفصيل الحركات' },
      { id: 5, name: 'تقييم المخزون', description: 'القيمة الإجمالية' },
    ],
    accounting: [
      { id: 1, name: 'ميزان المراجعة', description: 'Trial Balance' },
      { id: 2, name: 'قائمة الدخل', description: 'Income Statement' },
      { id: 3, name: 'المركز المالي', description: 'Balance Sheet' },
      { id: 4, name: 'التدفقات النقدية', description: 'Cash Flow' },
      { id: 5, name: 'الأستاذ العام', description: 'General Ledger' },
      { id: 6, name: 'أعمار الديون', description: 'Customer Aging' },
    ],
    tax: [
      { id: 1, name: 'ملخص الضريبة', description: 'VAT Summary' },
      { id: 2, name: 'فواتير ZATCA', description: 'حالة الفواتير' },
      { id: 3, name: 'إقرار الضريبة', description: 'VAT Return' },
    ],
    customers: [
      { id: 1, name: 'كشف حساب', description: 'Statement of Account' },
      { id: 2, name: 'أعمار الديون', description: 'Aging Report' },
      { id: 3, name: 'تحليل المبيعات', description: 'Sales Analysis' },
    ],
    suppliers: [
      { id: 1, name: 'كشف حساب', description: 'Statement of Account' },
      { id: 2, name: 'أعمار الدائنين', description: 'Aging Report' },
      { id: 3, name: 'تحليل المشتريات', description: 'Purchases Analysis' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-600 mt-1">تقارير تشغيلية ومالية شاملة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* الفئات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">الفئات</h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* التقارير */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-6">
            {categories.find((c) => c.id === activeCategory)?.label} - التقارير
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports[activeCategory as keyof typeof reports]?.map((report) => (
              <div
                key={report.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <h4 className="font-medium text-gray-900 mb-1">{report.name}</h4>
                <p className="text-sm text-gray-500">{report.description}</p>
                <button className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">
                  تشغيل التقرير →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
