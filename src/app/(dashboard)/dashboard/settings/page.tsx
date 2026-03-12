/**
 * Mayas ERP - Settings Page
 * صفحة الإعدادات
 */

'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'الشركة' },
    { id: 'branches', label: 'الفروع' },
    { id: 'warehouses', label: 'المستودعات' },
    { id: 'users', label: 'المستخدمون' },
    { id: 'roles', label: 'الأدوار' },
    { id: 'tax', label: 'الضرائب' },
    { id: 'integrations', label: 'التكاملات' },
  ];

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-600 mt-1">إعدادات النظام والشركة</p>
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* محتوى التبويبات */}
          {activeTab === 'company' && <CompanySettings />}
          {activeTab === 'branches' && <BranchesSettings />}
          {activeTab === 'warehouses' && <WarehousesSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'roles' && <RolesSettings />}
          {activeTab === 'tax' && <TaxSettings />}
          {activeTab === 'integrations' && <IntegrationsSettings />}
        </div>
      </div>
    </div>
  );
}

function CompanySettings() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم الشركة (عربي)
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            defaultValue="منصة مياس للمحاسبة"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم الشركة (إنجليزي)
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            defaultValue="Mayas Accounting Platform"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الرقم الضريبي
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="3xxxxxxxxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            السجل التجاري
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="10xxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="info@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم الهاتف
          </label>
          <input
            type="tel"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="+966 50 000 0000"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}

function BranchesSettings() {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">الفروع</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          إضافة فرع
        </button>
      </div>
      <p className="text-gray-500">لا توجد فروع حالياً</p>
    </div>
  );
}

function WarehousesSettings() {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">المستودعات</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          إضافة مستودع
        </button>
      </div>
      <p className="text-gray-500">لا توجد مستودعات حالياً</p>
    </div>
  );
}

function UsersSettings() {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">المستخدمون</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          إضافة مستخدم
        </button>
      </div>
      <p className="text-gray-500">لا يوجد مستخدمون حالياً</p>
    </div>
  );
}

function RolesSettings() {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">الأدوار والصلاحيات</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          إضافة دور
        </button>
      </div>
      <p className="text-gray-500">الأدوار الافتراضية جاهزة</p>
    </div>
  );
}

function TaxSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">إعدادات الضريبة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة ضريبة القيمة المضافة
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              defaultValue="15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الضريبة
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>VAT - ضريبة القيمة المضافة</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">التكاملات</h3>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">OpenRouter AI</h4>
              <p className="text-sm text-gray-500">المساعد الذكي</p>
            </div>
            <span className="text-yellow-600">غير مفعل</span>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">Salla</h4>
              <p className="text-sm text-gray-500">التجارة الإلكترونية</p>
            </div>
            <span className="text-yellow-600">غير مفعل</span>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">ZATCA</h4>
              <p className="text-sm text-gray-500">الفواتير الإلكترونية</p>
            </div>
            <span className="text-yellow-600">غير مفعل</span>
          </div>
        </div>
      </div>
    </div>
  );
}
