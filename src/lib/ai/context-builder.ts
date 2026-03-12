/**
 * Mayas ERP - AI Context Builder
 * بناء سياق للمحادثة
 */

import { db } from '@/lib/db';

export interface AIContext {
  company: {
    name: string;
    currency: string;
  };
  stats: {
    totalItems: number;
    totalCustomers: number;
    totalSuppliers: number;
    todaySales: number;
    monthSales: number;
  };
  permissions: string[];
}

/**
 * بناء سياق للمستخدم
 */
export async function buildUserContext(
  companyId: string,
  userId: string
): Promise<AIContext> {
  // جلب معلومات الشركة
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      nameAr: true,
      defaultCurrency: true,
    },
  });

  // جلب الإحصائيات
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalItems,
    totalCustomers,
    totalSuppliers,
    todaySales,
    monthSales,
  ] = await Promise.all([
    db.item.count({ where: { companyId, isActive: true } }),
    db.customer.count({ where: { companyId, isActive: true } }),
    db.supplier.count({ where: { companyId, isActive: true } }),
    db.salesInvoice.aggregate({
      where: {
        companyId,
        invoiceDate: { gte: today },
        status: 'POSTED',
      },
      _sum: { totalAmount: true },
    }),
    db.salesInvoice.aggregate({
      where: {
        companyId,
        invoiceDate: { gte: firstDayOfMonth },
        status: 'POSTED',
      },
      _sum: { totalAmount: true },
    }),
  ]);

  // جلب صلاحيات المستخدم
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  userRoles.forEach((ur) => {
    ur.role.permissions.forEach((rp) => {
      permissions.add(`${rp.permission.module}:${rp.permission.action}`);
    });
  });

  return {
    company: {
      name: company?.nameAr || 'منصة مياس',
      currency: company?.defaultCurrency || 'SAR',
    },
    stats: {
      totalItems,
      totalCustomers,
      totalSuppliers,
      todaySales: todaySales._sum.totalAmount?.toNumber() || 0,
      monthSales: monthSales._sum.totalAmount?.toNumber() || 0,
    },
    permissions: Array.from(permissions),
  };
}

/**
 * تحويل السياق لنص
 */
export function contextToText(context: AIContext): string {
  return `
الشركة: ${context.company.name}
العملة: ${context.company.currency}

الإحصائيات:
- عدد الأصناف: ${context.stats.totalItems}
- عدد العملاء: ${context.stats.totalCustomers}
- عدد الموردين: ${context.stats.totalSuppliers}
- مبيعات اليوم: ${context.stats.todaySales.toLocaleString()} ${context.company.currency}
- مبيعات الشهر: ${context.stats.monthSales.toLocaleString()} ${context.company.currency}

الصلاحيات: ${context.permissions.join(', ')}
  `.trim();
}
