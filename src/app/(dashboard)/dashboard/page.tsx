'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui/Table';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Plus,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// بيانات تجريبية للعرض
const stats = [
  {
    title: 'إجمالي المبيعات',
    value: '45,230 ر.س',
    change: { value: 12.5, type: 'increase' as const, label: 'من الشهر الماضي' },
    icon: <DollarSign className="w-6 h-6" />,
    iconBg: 'bg-green-100 text-green-600',
  },
  {
    title: 'الطلبات',
    value: '1,234',
    change: { value: 8.2, type: 'increase' as const, label: 'من الشهر الماضي' },
    icon: <ShoppingCart className="w-6 h-6" />,
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'المنتجات',
    value: '5,678',
    change: { value: 2.1, type: 'decrease' as const, label: 'من الشهر الماضي' },
    icon: <Package className="w-6 h-6" />,
    iconBg: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'العملاء',
    value: '892',
    change: { value: 15.3, type: 'increase' as const, label: 'من الشهر الماضي' },
    icon: <Users className="w-6 h-6" />,
    iconBg: 'bg-orange-100 text-orange-600',
  },
];

const recentOrders = [
  {
    id: '#1234',
    customer: 'محمد أحمد',
    products: 'زيت محرك + فلتر هواء',
    total: '450 ر.س',
    status: 'مكتمل' as const,
    date: 'منذ 5 دقائق',
  },
  {
    id: '#1233',
    customer: 'خالد محمود',
    products: 'مساحات زجاج أمامي',
    total: '120 ر.س',
    status: 'قيد التنفيذ' as const,
    date: 'منذ 15 دقيقة',
  },
  {
    id: '#1232',
    customer: 'عبدالله سعد',
    products: 'بطارية سيارة 70Ah',
    total: '380 ر.س',
    status: 'مكتمل' as const,
    date: 'منذ 30 دقيقة',
  },
  {
    id: '#1231',
    customer: 'فهد العتيبي',
    products: 'إطارات ميشلان 4 قطع',
    total: '1,200 ر.س',
    status: 'معلق' as const,
    date: 'منذ ساعة',
  },
  {
    id: '#1230',
    customer: 'سعد القحطاني',
    products: 'سوائل فرامل + تبريد',
    total: '95 ر.س',
    status: 'مكتمل' as const,
    date: 'منذ ساعتين',
  },
];

const lowStockProducts = [
  { name: 'زيت محرك 5W-30', stock: 5, minStock: 10, unit: 'عبوة' },
  { name: 'فلتر هواء تويوتا', stock: 3, minStock: 15, unit: 'قطعة' },
  { name: 'مساحات زجاج 24"', stock: 8, minStock: 20, unit: 'زوج' },
  { name: 'سائل تبريد أحمر', stock: 2, minStock: 12, unit: 'لتر' },
];

const getStatusBadge = (status: 'مكتمل' | 'قيد التنفيذ' | 'معلق') => {
  const variants = {
    'مكتمل': 'success',
    'قيد التنفيذ': 'warning',
    'معلق': 'danger',
  } as const;
  return <Badge variant={variants[status]}>{status}</Badge>;
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">مرحباً بك مرة أخرى، ماجد! إليك نظرة عامة على نشاطك.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
            تصدير التقرير
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            إنشاء فاتورة
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            iconBg={stat.iconBg}
            hoverable
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <Card className="lg:col-span-2" padding="none">
          <CardHeader className="px-6 pt-6 pb-4" bordered>
            <div className="flex items-center justify-between">
              <CardTitle>الطلبات الأخيرة</CardTitle>
              <Button variant="ghost" size="sm">
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent padding>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead className="hidden md:table-cell">المنتجات</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden sm:table-cell">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-blue-600">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 max-w-[200px] truncate">
                      {order.products}
                    </TableCell>
                    <TableCell className="font-medium">{order.total}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card padding="none">
          <CardHeader className="px-6 pt-6 pb-4" bordered>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <CardTitle>تنبيه المخزون</CardTitle>
              </div>
              <Badge variant="warning">{lowStockProducts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent padding>
            <div className="space-y-4">
              {lowStockProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-red-600 font-medium">
                        {product.stock} {product.unit}
                      </span>
                      <span className="text-xs text-gray-400">من {product.minStock}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" fullWidth className="mt-4">
                إدارة المخزون
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button className="flex flex-col items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">نقطة البيع</span>
            </button>
            <button className="flex flex-col items-center gap-3 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">فاتورة جديدة</span>
            </button>
            <button className="flex flex-col items-center gap-3 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">إضافة منتج</span>
            </button>
            <button className="flex flex-col items-center gap-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">عميل جديد</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
