/**
 * Mayas ERP - Customers API
 * API العملاء
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { customerSchema } from '@/lib/validations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CustomersAPI');

// GET - جلب قائمة العملاء
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * pageSize;

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { code: { contains: search } },
          { nameAr: { contains: search } },
          { nameEn: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customerGroup: true,
          addresses: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return paginatedResponse(customers, total, page, pageSize);
  } catch (error) {
    logger.error('خطأ في جلب العملاء', error as Error);
    return errorResponse('خطأ في جلب العملاء');
  }
}

// POST - إنشاء عميل جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;

    const customer = await prisma.customer.create({
      data: {
        companyId: '00000000-0000-0000-0000-000000000001',
        ...data,
      },
    });

    logger.info('تم إنشاء عميل جديد', { customerId: customer.id });

    return successResponse(customer, 'تم إنشاء العميل بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء العميل', error as Error);
    return errorResponse('خطأ في إنشاء العميل');
  }
}
