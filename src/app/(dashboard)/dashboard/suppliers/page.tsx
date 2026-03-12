/**
 * Mayas ERP - Suppliers Page
 * صفحة الموردين
 */

'use client';

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الموردين</h1>
          <p className="text-gray-600 mt-1">إدارة بيانات الموردين</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          إضافة مورد
        </button>
      </div>

      {/* جدول الموردين */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الكود
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الاسم
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الدولة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الهاتف
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الرصيد
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                لا يوجد موردين حالياً
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
