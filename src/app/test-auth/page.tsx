/**
 * Mayas ERP - Auth Test Page
 * صفحة اختبار نظام المصادقة
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, MODULES, PERMISSIONS, ROLES } from '@/hooks/usePermissions';

export default function AuthTestPage() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const {
    hasPermission,
    hasRole,
    can,
    is,
    permissions,
    roles,
    isAdmin,
    isSuperAdmin,
  } = usePermissions();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    const result = await login({ username, password, rememberMe });
    if (result.success) {
      alert('تم تسجيل الدخول بنجاح!');
    } else {
      alert(`خطأ: ${result.error}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    alert('تم تسجيل الخروج بنجاح!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            اختبار نظام المصادقة
          </h1>

          {/* حالة المصادقة */}
          <div className="mb-6 p-4 rounded-lg bg-gray-100">
            <h2 className="text-xl font-semibold mb-3">حالة المصادقة</h2>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isAuthenticated
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isAuthenticated ? 'مسجل الدخول' : 'غير مسجل الدخول'}
              </span>
            </div>
          </div>

          {/* معلومات المستخدم */}
          {user && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50">
              <h2 className="text-xl font-semibold mb-3 text-blue-900">
                معلومات المستخدم
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">الاسم:</span>{' '}
                  <span className="text-blue-700">{user.fullName}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">البريد:</span>{' '}
                  <span className="text-blue-700">{user.email}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">اسم المستخدم:</span>{' '}
                  <span className="text-blue-700">{user.username}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">اللغة:</span>{' '}
                  <span className="text-blue-700">{user.language}</span>
                </div>
              </div>
            </div>
          )}

          {/* الأدوار والصلاحيات */}
          {user && (
            <div className="mb-6 p-4 rounded-lg bg-green-50">
              <h2 className="text-xl font-semibold mb-3 text-green-900">
                الأدوار والصلاحيات
              </h2>
              
              <div className="mb-4">
                <h3 className="font-medium text-green-800 mb-2">الأدوار:</h3>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium text-green-800 mb-2">الصلاحيات:</h3>
                <div className="flex flex-wrap gap-2">
                  {permissions.slice(0, 10).map((permission) => (
                    <span
                      key={permission}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                  {permissions.length > 10 && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      +{permissions.length - 10} المزيد
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    مدير: {isAdmin ? 'نعم' : 'لا'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    مدير نظام: {isSuperAdmin ? 'نعم' : 'لا'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* اختبار الصلاحيات */}
          {user && (
            <div className="mb-6 p-4 rounded-lg bg-yellow-50">
              <h2 className="text-xl font-semibold mb-3 text-yellow-900">
                اختبار الصلاحيات
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-gray-800 mb-2">
                    صلاحية عرض المستخدمين:
                  </p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      can(MODULES.USERS, PERMISSIONS.VIEW)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {can(MODULES.USERS, PERMISSIONS.VIEW) ? 'مسموح' : 'غير مسموح'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-gray-800 mb-2">
                    صلاحية إنشاء الفواتير:
                  </p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      can(MODULES.SALES, PERMISSIONS.CREATE)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {can(MODULES.SALES, PERMISSIONS.CREATE) ? 'مسموح' : 'غير مسموح'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-gray-800 mb-2">دور المدير:</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      is(ROLES.ADMIN)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {is(ROLES.ADMIN) ? 'نعم' : 'لا'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-gray-800 mb-2">دور المحاسب:</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      is(ROLES.ACCOUNTANT)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {is(ROLES.ACCOUNTANT) ? 'نعم' : 'لا'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* نموذج تسجيل الدخول */}
          <div className="mb-6 p-4 rounded-lg bg-gray-100">
            <h2 className="text-xl font-semibold mb-4">
              {isAuthenticated ? 'تسجيل الخروج' : 'تسجيل الدخول'}
            </h2>

            {!isAuthenticated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المستخدم أو البريد الإلكتروني
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل اسم المستخدم أو البريد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-gray-700">
                    تذكرني
                  </label>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  تسجيل الدخول
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                تسجيل الخروج
              </button>
            )}
          </div>

          {/* ملاحظات */}
          <div className="p-4 rounded-lg bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">ملاحظات:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• هذا نظام مصادقة كامل مع Supabase Auth + JWT + RBAC</li>
              <li>• يتم تخزين JWT في cookie آمن</li>
              <li>• الصلاحيات تعتمد على الأدوار (RBAC)</li>
              <li>• النظام يدعم RTL للغة العربية</li>
              <li>• جميع الردود باللغة العربية</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
