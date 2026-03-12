'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Search, Moon, Sun, User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  title?: string;
  subtitle?: string;
}

export function Header({ sidebarCollapsed = false, title, subtitle }: HeaderProps) {
  const [isDark, setIsDark] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const notifications = [
    {
      id: 1,
      title: 'فاتورة جديدة',
      message: 'تم إنشاء فاتورة رقم #1234',
      time: 'منذ 5 دقائق',
      unread: true,
    },
    {
      id: 2,
      title: 'تنبيه مخزون',
      message: 'المنتج "زيت محرك 5W-30" وصل للحد الأدنى',
      time: 'منذ ساعة',
      unread: true,
    },
    {
      id: 3,
      title: 'دفعة مستحقة',
      message: 'فاتورة مورد "الشركة العربية" تستحق غداً',
      time: 'منذ 3 ساعات',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header
      className={cn(
        'fixed top-0 h-16 bg-white border-b border-gray-200 z-30',
        'flex items-center justify-between px-6',
        'transition-all duration-300',
        sidebarCollapsed ? 'right-20 left-0' : 'right-64 left-0'
      )}
    >
      {/* Left Side - Page Title & Search */}
      <div className="flex items-center gap-6">
        {/* Page Title */}
        {(title || subtitle) && (
          <div className="hidden md:block">
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث..."
            className="w-72 pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 transition-all"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <button
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="بحث"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="تبديل الوضع"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">الإشعارات</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-blue-600 font-medium">
                      {unreadCount} غير مقروء
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors',
                        notification.unread && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {notification.unread && (
                          <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5 truncate">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <button className="w-full text-center text-sm text-blue-600 font-medium hover:text-blue-700">
                    عرض كل الإشعارات
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              م
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900">ماجد السعدي</p>
                  <p className="text-sm text-gray-500">admin@mayas-erp.com</p>
                </div>
                <div className="py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">الملف الشخصي</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">الإعدادات</span>
                  </button>
                </div>
                <div className="border-t border-gray-100 py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
