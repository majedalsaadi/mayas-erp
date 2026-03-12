'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Store,
  Receipt,
  Truck,
  Wallet,
} from 'lucide-react';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainItems: SidebarItem[] = [
  {
    title: 'لوحة التحكم',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: 'نقطة البيع',
    href: '/dashboard/pos',
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    title: 'الفواتير',
    href: '/dashboard/invoices',
    icon: <Receipt className="w-5 h-5" />,
    badge: 3,
  },
  {
    title: 'المنتجات',
    href: '/dashboard/products',
    icon: <Package className="w-5 h-5" />,
  },
  {
    title: 'المخزون',
    href: '/dashboard/inventory',
    icon: <Store className="w-5 h-5" />,
  },
  {
    title: 'الموردين',
    href: '/dashboard/suppliers',
    icon: <Truck className="w-5 h-5" />,
  },
  {
    title: 'العملاء',
    href: '/dashboard/customers',
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: 'المالية',
    href: '/dashboard/finance',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    title: 'التقارير',
    href: '/dashboard/reports',
    icon: <BarChart3 className="w-5 h-5" />,
  },
];

const secondaryItems: SidebarItem[] = [
  {
    title: 'الإعدادات',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    title: 'المساعدة',
    href: '/dashboard/help',
    icon: <HelpCircle className="w-5 h-5" />,
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed top-0 right-0 h-screen bg-white border-l border-gray-200 shadow-sm',
        'flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">م</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">مياس</span>
              <span className="text-xs text-gray-500">نظام المحاسبة</span>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => onCollapse?.(!collapsed)}
        className="absolute -left-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors shadow-sm"
      >
        {collapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-l-full" />
                )}
                <span
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.title}</span>
                    {item.badge && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-100" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'group',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="font-medium">{item.title}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className={cn(
        'border-t border-gray-100 p-4',
        collapsed && 'px-2'
      )}>
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'justify-center'
        )}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            م
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">ماجد السعدي</p>
              <p className="text-xs text-gray-500 truncate">مدير النظام</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
