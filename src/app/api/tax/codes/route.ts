/**
 * Mayas ERP - Tax Codes API
 * API أكواد الضريبة
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { taxCodeSchema } from '@/types/tax';
import { createLogger } from '@/lib/logger';
import { initializeDefaultTaxCodes } from '@/lib/tax/calculator';
import { Decimal } from '@prisma/client/runtime/library';

const logger = createLogger('TaxCodesAPI');

// ============================================
// GET - جلب أكواد الضريبة
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const skip = (page - 1) * pageSize;

    const where = {
      ...(activeOnly && { isActive: true }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
          { nameEn: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [taxCodes, total] = await Promise.all([
      prisma.taxCode.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { company: true },
          },
        },
        orderBy: [
          { isDefaultSales: 'desc' },
          { code: 'asc' },
        ],
      }),
      prisma.taxCode.count({ where }),
    ]);

    // تحويل Decimal إلى number
    const formattedCodes = taxCodes.map((code) => ({
      ...code,
      rate: Number(code.rate),
    }));

    return paginatedResponse(formattedCodes, total, page, pageSize);
  } catch (error) {
    logger.error('خطأ في جلب أكواد الضريبة', error as Error);
    return errorResponse('خطأ في جلب أكواد الضريبة');
  }
}

// ============================================
// POST - إنشاء كود ضريبي جديد
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = taxCodeSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;
    const companyId = '00000000-0000-0000-0000-000000000001'; // يجب الحصول عليه من السياق

    // التحقق من عدم وجود كود مكرر
    const existingCode = await prisma.taxCode.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existingCode) {
      return errorResponse('كود الضريبة موجود مسبقاً', 409);
    }

    // إذا كان الكود افتراضي للمبيعات، إزالة الافتراضي من الآخرين
    if (data.isDefaultSales) {
      await prisma.taxCode.updateMany({
        where: { companyId, isDefaultSales: true },
        data: { isDefaultSales: false },
      });
    }

    // إذا كان الكود افتراضي للمشتريات، إزالة الافتراضي من الآخرين
    if (data.isDefaultPurchase) {
      await prisma.taxCode.updateMany({
        where: { companyId, isDefaultPurchase: true },
        data: { isDefaultPurchase: false },
      });
    }

    // إنشاء كود الضريبة
    const taxCode = await prisma.taxCode.create({
      data: {
        companyId,
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        rate: new Decimal(data.rate),
        taxType: data.taxType,
        zatcaCategory: data.zatcaCategory,
        isDefaultSales: data.isDefaultSales,
        isDefaultPurchase: data.isDefaultPurchase,
        isActive: data.isActive,
      },
    });

    logger.info('تم إنشاء كود ضريبي جديد', { 
      taxCodeId: taxCode.id, 
      code: taxCode.code 
    });

    return successResponse({
      ...taxCode,
      rate: Number(taxCode.rate),
    }, 'تم إنشاء كود الضريبة بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء كود الضريبة', error as Error);
    return errorResponse('خطأ في إنشاء كود الضريبة');
  }
}

// ============================================
// PUT - تحديث كود ضريبي
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('معرف كود الضريبة مطلوب', 400);
    }

    // التحقق من البيانات
    const validation = taxCodeSchema.partial().safeParse(updateData);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;
    const companyId = '00000000-0000-0000-0000-000000000001';

    // التحقق من وجود الكود
    const existingCode = await prisma.taxCode.findFirst({
      where: { id, companyId },
    });

    if (!existingCode) {
      return errorResponse('كود الضريبة غير موجود', 404);
    }

    // إذا كان الكود افتراضي للمبيعات، إزالة الافتراضي من الآخرين
    if (data.isDefaultSales) {
      await prisma.taxCode.updateMany({
        where: { companyId, isDefaultSales: true, id: { not: id } },
        data: { isDefaultSales: false },
      });
    }

    // إذا كان الكود افتراضي للمشتريات، إزالة الافتراضي من الآخرين
    if (data.isDefaultPurchase) {
      await prisma.taxCode.updateMany({
        where: { companyId, isDefaultPurchase: true, id: { not: id } },
        data: { isDefaultPurchase: false },
      });
    }

    // تحديث كود الضريبة
    const taxCode = await prisma.taxCode.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.nameAr && { nameAr: data.nameAr }),
        ...(data.nameEn && { nameEn: data.nameEn }),
        ...(data.rate !== undefined && { rate: new Decimal(data.rate) }),
        ...(data.taxType && { taxType: data.taxType }),
        ...(data.zatcaCategory !== undefined && { zatcaCategory: data.zatcaCategory }),
        ...(data.isDefaultSales !== undefined && { isDefaultSales: data.isDefaultSales }),
        ...(data.isDefaultPurchase !== undefined && { isDefaultPurchase: data.isDefaultPurchase }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info('تم تحديث كود ضريبي', { taxCodeId: taxCode.id });

    return successResponse({
      ...taxCode,
      rate: Number(taxCode.rate),
    }, 'تم تحديث كود الضريبة بنجاح');
  } catch (error) {
    logger.error('خطأ في تحديث كود الضريبة', error as Error);
    return errorResponse('خطأ في تحديث كود الضريبة');
  }
}

// ============================================
// DELETE - حذف كود ضريبي
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('معرف كود الضريبة مطلوب', 400);
    }

    const companyId = '00000000-0000-0000-0000-000000000001';

    // التحقق من وجود الكود
    const existingCode = await prisma.taxCode.findFirst({
      where: { id, companyId },
    });

    if (!existingCode) {
      return errorResponse('كود الضريبة غير موجود', 404);
    }

    // التحقق من عدم استخدام الكود في أصناف
    const itemsCount = await prisma.item.count({
      where: { taxCodeId: id },
    });

    if (itemsCount > 0) {
      return errorResponse(
        `لا يمكن حذف الكود - مستخدم في ${itemsCount} صنف`,
        409
      );
    }

    // حذف كود الضريبة
    await prisma.taxCode.delete({
      where: { id },
    });

    logger.info('تم حذف كود ضريبي', { taxCodeId: id });

    return successResponse(null, 'تم حذف كود الضريبة بنجاح');
  } catch (error) {
    logger.error('خطأ في حذف كود الضريبة', error as Error);
    return errorResponse('خطأ في حذف كود الضريبة');
  }
}

// ============================================
// POST - تهيئة الأكواد الافتراضية
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, companyId } = body;

    if (action === 'initialize-defaults') {
      const targetCompanyId = companyId || '00000000-0000-0000-0000-000000000001';
      await initializeDefaultTaxCodes(targetCompanyId);
      
      logger.info('تم تهيئة أكواد الضريبة الافتراضية', { companyId: targetCompanyId });
      
      return successResponse(null, 'تم تهيئة أكواد الضريبة الافتراضية بنجاح');
    }

    return errorResponse('إجراء غير معروف', 400);
  } catch (error) {
    logger.error('خطأ في تهيئة أكواد الضريبة', error as Error);
    return errorResponse('خطأ في تهيئة أكواد الضريبة');
  }
}
