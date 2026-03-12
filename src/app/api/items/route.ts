/**
 * Mayas ERP - Items API
 * API الأصناف
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { itemSchema } from '@/lib/validations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ItemsAPI');

// GET - جلب قائمة الأصناف
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || undefined;

    const skip = (page - 1) * pageSize;

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { code: { contains: search } },
          { nameAr: { contains: search } },
          { nameEn: { contains: search } },
          { partNumber: { contains: search } },
          { oemNumber: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: true,
          brand: true,
          unit: true,
          prices: {
            include: {
              priceTier: true,
            },
          },
          _count: {
            select: { stockBalances: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ]);

    return paginatedResponse(items, total, page, pageSize);
  } catch (error) {
    logger.error('خطأ في جلب الأصناف', error as Error);
    return errorResponse('خطأ في جلب الأصناف');
  }
}

// POST - إنشاء صنف جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = itemSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;

    // التحقق من عدم وجود الصنف مسبقاً
    const existingItem = await prisma.item.findFirst({
      where: {
        companyId: '00000000-0000-0000-0000-000000000001', // TODO: من الجلسة
        code: data.code,
      },
    });

    if (existingItem) {
      return errorResponse('رمز الصنف موجود مسبقاً', 409);
    }

    // إنشاء الصنف
    const item = await prisma.item.create({
      data: {
        companyId: '00000000-0000-0000-0000-000000000001',
        ...data,
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    logger.info('تم إنشاء صنف جديد', { itemId: item.id, code: item.code });

    return successResponse(item, 'تم إنشاء الصنف بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء الصنف', error as Error);
    return errorResponse('خطأ في إنشاء الصنف');
  }
}
