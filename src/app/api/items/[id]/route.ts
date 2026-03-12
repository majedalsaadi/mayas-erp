/**
 * Mayas ERP - Single Item API
 * API صنف واحد
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api';
import { itemSchema } from '@/lib/validations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ItemAPI');

// GET - جلب صنف واحد
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        brand: true,
        manufacturer: true,
        unit: true,
        barcodes: true,
        prices: {
          include: {
            priceTier: true,
          },
        },
        vehicleCompatibilities: {
          include: {
            make: true,
            model: true,
            engine: true,
          },
        },
        stockBalances: {
          include: {
            warehouse: true,
            bin: true,
          },
        },
      },
    });

    if (!item) {
      return notFoundResponse('الصنف غير موجود');
    }

    return successResponse(item);
  } catch (error) {
    logger.error('خطأ في جلب الصنف', error as Error);
    return errorResponse('خطأ في جلب الصنف');
  }
}

// PUT - تحديث صنف
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const validation = itemSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;

    const item = await prisma.item.update({
      where: { id: params.id },
      data,
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    logger.info('تم تحديث الصنف', { itemId: item.id });

    return successResponse(item, 'تم تحديث الصنف بنجاح');
  } catch (error) {
    logger.error('خطأ في تحديث الصنف', error as Error);
    return errorResponse('خطأ في تحديث الصنف');
  }
}

// DELETE - حذف صنف
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // حذف ناعم - تغيير الحالة فقط
    const item = await prisma.item.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    logger.info('تم حذف الصنف', { itemId: item.id });

    return successResponse(null, 'تم حذف الصنف بنجاح');
  } catch (error) {
    logger.error('خطأ في حذف الصنف', error as Error);
    return errorResponse('خطأ في حذف الصنف');
  }
}
