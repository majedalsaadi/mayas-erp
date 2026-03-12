/**
 * Mayas ERP - Seed Data Status API
 * حالة البيانات الأولية
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api';

export async function GET() {
  try {
    const [
      companiesCount,
      branchesCount,
      warehousesCount,
      usersCount,
      itemsCount,
      customersCount,
      suppliersCount,
      accountsCount,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.branch.count(),
      prisma.warehouse.count(),
      prisma.user.count(),
      prisma.item.count(),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.account.count(),
    ]);

    const status = {
      seeded: companiesCount > 0,
      counts: {
        companies: companiesCount,
        branches: branchesCount,
        warehouses: warehousesCount,
        users: usersCount,
        items: itemsCount,
        customers: customersCount,
        suppliers: suppliersCount,
        accounts: accountsCount,
      },
      message: companiesCount > 0
        ? 'البيانات الأولية موجودة'
        : 'البيانات الأولية غير موجودة - قم بتشغيل npm run db:seed',
    };

    return successResponse(status);
  } catch (error) {
    return errorResponse('خطأ في جلب حالة البيانات');
  }
}
