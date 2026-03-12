/**
 * Mayas ERP - Purchase Returns API
 * API مردودات الشراء
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  updatePurchaseReturn,
  deletePurchaseReturn,
  postPurchaseReturn,
  cancelPurchaseReturn,
  getPurchaseReturnStatistics,
  createReturnFromInvoice,
} from '@/lib/purchasing/returns';

const logger = createLogger('PurchaseReturnsAPI');

// ============================================
// Validation Schemas
// ============================================

const purchaseReturnLineSchema = z.object({
  itemId: z.string().uuid('معرف الصنف غير صحيح'),
  originalLineId: z.string().uuid().optional(),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitId: z.string().uuid('معرف الوحدة غير صحيح'),
  unitFactor: z.number().positive().optional(),
  unitCost: z.number().min(0, 'التكلفة يجب أن تكون أكبر من أو يساوي صفر'),
  discountAmount: z.number().min(0).optional(),
  taxCodeId: z.string().uuid().optional(),
  fromBinId: z.string().uuid().optional(),
  returnReason: z.string().optional(),
});

const createPurchaseReturnSchema = z.object({
  branchId: z.string().uuid('معرف الفرع غير صحيح'),
  warehouseId: z.string().uuid('معرف المستودع غير صحيح'),
  supplierId: z.string().uuid('معرف المورد غير صحيح'),
  originalInvoiceId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  returnDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseReturnLineSchema).min(1, 'يجب إضافة بند واحد على الأقل'),
});

const updatePurchaseReturnSchema = z.object({
  supplierId: z.string().uuid().optional(),
  originalInvoiceId: z.string().uuid().optional().nullable(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  returnDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(purchaseReturnLineSchema).min(1).optional(),
});

const returnFromInvoiceLineSchema = z.object({
  itemId: z.string().uuid('معرف الصنف غير صحيح'),
  originalLineId: z.string().uuid().optional(),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  returnReason: z.string().optional(),
});

const createReturnFromInvoiceSchema = z.object({
  originalInvoiceId: z.string().uuid('معرف الفاتورة الأصلية غير صحيح'),
  branchId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  returnDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(returnFromInvoiceLineSchema).min(1, 'يجب إضافة بند واحد على الأقل'),
});

// TODO: الحصول على معرف الشركة من الجلسة
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// GET - جلب قائمة مردودات الشراء
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // معايير التصفح
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') as 'date' | 'number' | 'amount' | 'supplier' | 'status' | 'createdAt' || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    
    // معايير التضمين
    const includeSupplier = searchParams.get('includeSupplier') === 'true';
    const includeBranch = searchParams.get('includeBranch') === 'true';
    const includeWarehouse = searchParams.get('includeWarehouse') === 'true';
    const includeLines = searchParams.get('includeLines') === 'true';
    
    // معايير التصفية
    const filters = {
      query: searchParams.get('search') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      originalInvoiceId: searchParams.get('originalInvoiceId') || undefined,
      purchaseOrderId: searchParams.get('purchaseOrderId') || undefined,
      status: searchParams.get('status') as any || undefined,
      dateRange: searchParams.get('dateFrom') || searchParams.get('dateTo') ? {
        from: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
        to: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      } : undefined,
    };

    // التحقق من طلب الإحصائيات
    if (searchParams.get('stats') === 'true') {
      const stats = await getPurchaseReturnStatistics(
        COMPANY_ID,
        filters.dateRange?.from,
        filters.dateRange?.to
      );
      return successResponse(stats);
    }

    // التحقق من طلب مردود محدد
    const returnId = searchParams.get('id');
    if (returnId) {
      const purchaseReturn = await getPurchaseReturnById(COMPANY_ID, returnId);
      if (!purchaseReturn) {
        return errorResponse('مردود الشراء غير موجود', 404);
      }
      return successResponse(purchaseReturn);
    }

    const result = await getPurchaseReturns(COMPANY_ID, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      includeSupplier,
      includeBranch,
      includeWarehouse,
      includeLines,
      filters,
    });

    return paginatedResponse(result.returns, result.total, result.page, result.pageSize);
  } catch (error) {
    logger.error('خطأ في جلب مردودات الشراء', error as Error);
    return errorResponse('خطأ في جلب مردودات الشراء');
  }
}

// ============================================
// POST - إنشاء مردود شراء جديد
// ============================================

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromInvoice = searchParams.get('fromInvoice');
    
    // إنشاء مردود من فاتورة شراء
    if (fromInvoice) {
      const body = await request.json();
      
      // التحقق من البيانات
      const validation = createReturnFromInvoiceSchema.safeParse({
        originalInvoiceId: fromInvoice,
        ...body,
      });
      
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'بيانات غير صحيحة',
            details: validation.error.flatten(),
          },
          { status: 400 }
        );
      }

      const data = validation.data;

      const purchaseReturn = await createReturnFromInvoice(
        COMPANY_ID,
        USER_ID,
        data.originalInvoiceId,
        data.lines.map(line => ({
          itemId: line.itemId,
          originalLineId: line.originalLineId,
          qty: line.qty,
          returnReason: line.returnReason,
        })),
        {
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
          notes: data.notes,
        }
      );

      logger.info('تم إنشاء مردود من فاتورة شراء عبر API', {
        originalInvoiceId: fromInvoice,
        purchaseReturnId: purchaseReturn.id,
      });

      return successResponse(purchaseReturn, 'تم إنشاء المردود من الفاتورة بنجاح');
    }

    // إنشاء مردود عادي
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = createPurchaseReturnSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات غير صحيحة',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // تحويل التواريخ
    const returnData = {
      ...data,
      returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
    };

    // إنشاء المردود
    const purchaseReturn = await createPurchaseReturn(COMPANY_ID, USER_ID, returnData);

    logger.info('تم إنشاء مردود شراء جديد عبر API', {
      purchaseReturnId: purchaseReturn.id,
      returnNo: purchaseReturn.returnNo,
    });

    return successResponse(purchaseReturn, 'تم إنشاء مردود الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء مردود الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في إنشاء مردود الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PUT - تحديث مردود شراء
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseReturnId = searchParams.get('id');
    
    if (!purchaseReturnId) {
      return errorResponse('معرف مردود الشراء مطلوب', 400);
    }

    const body = await request.json();
    
    // التحقق من البيانات
    const validation = updatePurchaseReturnSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'بيانات غير صحيحة',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // تحويل التواريخ
    const returnData = {
      ...data,
      returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
    };

    // تحديث المردود
    const purchaseReturn = await updatePurchaseReturn(COMPANY_ID, USER_ID, purchaseReturnId, returnData);

    logger.info('تم تحديث مردود الشراء عبر API', { purchaseReturnId });

    return successResponse(purchaseReturn, 'تم تحديث مردود الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في تحديث مردود الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تحديث مردود الشراء';
    return errorResponse(message);
  }
}

// ============================================
// DELETE - حذف مردود شراء
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseReturnId = searchParams.get('id');
    
    if (!purchaseReturnId) {
      return errorResponse('معرف مردود الشراء مطلوب', 400);
    }

    await deletePurchaseReturn(COMPANY_ID, purchaseReturnId);

    logger.info('تم حذف مردود الشراء عبر API', { purchaseReturnId });

    return successResponse(null, 'تم حذف مردود الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في حذف مردود الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في حذف مردود الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PATCH - عمليات خاصة (ترحيل، إلغاء)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseReturnId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!purchaseReturnId) {
      return errorResponse('معرف مردود الشراء مطلوب', 400);
    }

    if (!action) {
      return errorResponse('العملية مطلوبة', 400);
    }

    let result;

    switch (action) {
      case 'post':
        result = await postPurchaseReturn(COMPANY_ID, USER_ID, purchaseReturnId);
        return successResponse(result, 'تم ترحيل مردود الشراء بنجاح');

      case 'cancel':
        await cancelPurchaseReturn(COMPANY_ID, USER_ID, purchaseReturnId);
        return successResponse(null, 'تم إلغاء مردود الشراء بنجاح');

      default:
        return errorResponse('عملية غير معروفة', 400);
    }
  } catch (error) {
    logger.error('خطأ في تنفيذ العملية', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تنفيذ العملية';
    return errorResponse(message);
  }
}
