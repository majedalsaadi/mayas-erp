/**
 * Mayas ERP - Items Page
 * صفحة الأصناف
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  partNumber?: string;
  isActive: boolean;
  category?: { nameAr: string };
  brand?: { nameAr: string };
  unit?: { nameAr: string };
  _count?: { stockBalances: number };
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchItems();
  }, [search]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/items?search=${search}`);
      const data = await response.json();
      setItems(data.data || []);
    } catch (error) {
      console.error('خطأ في جلب الأصناف:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأصناف</h1>
          <p className="text-gray-600 mt-1">إدارة أصناف قطع الغيار</p>
        </div>
        <Link
          href="/dashboard/items/new"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          إضافة صنف جديد
        </Link>
      </div>

      {/* البحث */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالرمز، الاسم، رقم القطعة..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            تصفية
          </button>
        </div>
      </div>

      {/* جدول الأصناف */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الرمز
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الاسم
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الفئة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الماركة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                رقم القطعة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  جاري التحميل...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  لا توجد أصناف
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {item.code}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.nameAr}</p>
                      <p className="text-sm text-gray-500">{item.nameEn}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.category?.nameAr || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.brand?.nameAr || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.partNumber || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        item.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/items/${item.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        عرض
                      </Link>
                      <Link
                        href={`/dashboard/items/${item.id}/edit`}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        تعديل
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
