/**
 * Mayas ERP - Purchase Orders API
 * API أوامر الشراء
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStatistics,
} from '@/lib/purchasing/orders';

const logger = createLogger('PurchaseOrdersAPI');

// ============================================
// Validation Schemas
// ============================================

const purchaseOrderLineSchema = z.object({
  itemId: z.string().uuid('معرف الصنف غير صحيح'),
  qtyOrdered: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitId: z.string().uuid('معرف الوحدة غير صحيح'),
  unitPrice: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي صفر'),
  discountAmount: z.number().min(0).optional(),
  taxCodeId: z.string().uuid().optional(),
});

const createPurchaseOrderSchema = z.object({
  branchId: z.string().uuid('معرف الفرع غير صحيح'),
  warehouseId: z.string().uuid('معرف المستودع غير صحيح'),
  supplierId: z.string().uuid('معرف المورد غير صحيح'),
  poDate: z.string().datetime().optional(),
  currencyCode: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, 'يجب إضافة بند واحد على الأقل'),
});

const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional(),
  poDate: z.string().datetime().optional(),
  currencyCode: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1).optional(),
});

// TODO: الحصول على معرف الشركة من الجلسة
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// GET - جلب قائمة أوامر الشراء
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
      status: searchParams.get('status') as any || undefined,
      dateRange: searchParams.get('dateFrom') || searchParams.get('dateTo') ? {
        from: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
        to: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      } : undefined,
    };

    // التحقق من طلب الإحصائيات
    if (searchParams.get('stats') === 'true') {
      const stats = await getPurchaseOrderStatistics(
        COMPANY_ID,
        filters.dateRange?.from,
        filters.dateRange?.to
      );
      return successResponse(stats);
    }

    const result = await getPurchaseOrders(COMPANY_ID, {
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

    return paginatedResponse(result.orders, result.total, result.page, result.pageSize);
  } catch (error) {
    logger.error('خطأ في جلب أوامر الشراء', error as Error);
    return errorResponse('خطأ في جلب أوامر الشراء');
  }
}

// ============================================
// POST - إنشاء أمر شراء جديد
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = createPurchaseOrderSchema.safeParse(body);
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
    const orderData = {
      ...data,
      poDate: data.poDate ? new Date(data.poDate) : undefined,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
    };

    // إنشاء أمر الشراء
    const purchaseOrder = await createPurchaseOrder(COMPANY_ID, USER_ID, orderData);

    logger.info('تم إنشاء أمر شراء جديد عبر API', {
      purchaseOrderId: purchaseOrder.id,
      poNo: purchaseOrder.poNo,
    });

    return successResponse(purchaseOrder, 'تم إنشاء أمر الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء أمر الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في إنشاء أمر الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PUT - تحديث أمر شراء
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseOrderId = searchParams.get('id');
    
    if (!purchaseOrderId) {
      return errorResponse('معرف أمر الشراء مطلوب', 400);
    }

    const body = await request.json();
    
    // التحقق من البيانات
    const validation = updatePurchaseOrderSchema.safeParse(body);
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
    const orderData = {
      ...data,
      poDate: data.poDate ? new Date(data.poDate) : undefined,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
    };

    // تحديث أمر الشراء
    const purchaseOrder = await updatePurchaseOrder(COMPANY_ID, USER_ID, purchaseOrderId, orderData);

    logger.info('تم تحديث أمر الشراء عبر API', { purchaseOrderId });

    return successResponse(purchaseOrder, 'تم تحديث أمر الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في تحديث أمر الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تحديث أمر الشراء';
    return errorResponse(message);
  }
}

// ============================================
// DELETE - حذف أمر شراء
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseOrderId = searchParams.get('id');
    
    if (!purchaseOrderId) {
      return errorResponse('معرف أمر الشراء مطلوب', 400);
    }

    await deletePurchaseOrder(COMPANY_ID, purchaseOrderId);

    logger.info('تم حذف أمر الشراء عبر API', { purchaseOrderId });

    return successResponse(null, 'تم حذف أمر الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في حذف أمر الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في حذف أمر الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PATCH - عمليات خاصة (اعتماد، إلغاء)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseOrderId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!purchaseOrderId) {
      return errorResponse('معرف أمر الشراء مطلوب', 400);
    }

    if (!action) {
      return errorResponse('العملية مطلوبة', 400);
    }

    let result;

    switch (action) {
      case 'approve':
        result = await approvePurchaseOrder(COMPANY_ID, USER_ID, purchaseOrderId);
        return successResponse(result, 'تم اعتماد أمر الشراء بنجاح');

      case 'cancel':
        await cancelPurchaseOrder(COMPANY_ID, USER_ID, purchaseOrderId);
        return successResponse(null, 'تم إلغاء أمر الشراء بنجاح');

      default:
        return errorResponse('عملية غير معروفة', 400);
    }
  } catch (error) {
    logger.error('خطأ في تنفيذ العملية', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تنفيذ العملية';
    return errorResponse(message);
  }
}
