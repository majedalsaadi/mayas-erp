/**
 * Mayas ERP - Purchase Invoices API
 * API فواتير الشراء
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import {
  createPurchaseInvoice,
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  postPurchaseInvoice,
  cancelPurchaseInvoice,
  getPurchaseInvoiceStatistics,
  createInvoiceFromPurchaseOrder,
} from '@/lib/purchasing/invoices';

const logger = createLogger('PurchaseInvoicesAPI');

// ============================================
// Validation Schemas
// ============================================

const purchaseInvoiceLineSchema = z.object({
  itemId: z.string().uuid('معرف الصنف غير صحيح'),
  description: z.string().optional(),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitId: z.string().uuid('معرف الوحدة غير صحيح'),
  unitFactor: z.number().positive().optional(),
  unitCost: z.number().min(0, 'التكلفة يجب أن تكون أكبر من أو يساوي صفر'),
  discountAmount: z.number().min(0).optional(),
  taxCodeId: z.string().uuid().optional(),
  toBinId: z.string().uuid().optional(),
});

const createPurchaseInvoiceSchema = z.object({
  branchId: z.string().uuid('معرف الفرع غير صحيح'),
  warehouseId: z.string().uuid('معرف المستودع غير صحيح'),
  supplierId: z.string().uuid('معرف المورد غير صحيح'),
  purchaseOrderId: z.string().uuid().optional(),
  supplierInvoiceNo: z.string().optional(),
  invoiceDate: z.string().datetime().optional(),
  currencyCode: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(purchaseInvoiceLineSchema).min(1, 'يجب إضافة بند واحد على الأقل'),
});

const updatePurchaseInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  supplierInvoiceNo: z.string().optional().nullable(),
  invoiceDate: z.string().datetime().optional(),
  currencyCode: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(purchaseInvoiceLineSchema).min(1).optional(),
});

// TODO: الحصول على معرف الشركة من الجلسة
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// GET - جلب قائمة فواتير الشراء
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
      purchaseOrderId: searchParams.get('purchaseOrderId') || undefined,
      status: searchParams.get('status') as any || undefined,
      paymentStatus: searchParams.get('paymentStatus') as 'paid' | 'unpaid' | 'partial' || undefined,
      dateRange: searchParams.get('dateFrom') || searchParams.get('dateTo') ? {
        from: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
        to: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      } : undefined,
      dueDateRange: searchParams.get('dueDateFrom') || searchParams.get('dueDateTo') ? {
        from: searchParams.get('dueDateFrom') ? new Date(searchParams.get('dueDateFrom')!) : undefined,
        to: searchParams.get('dueDateTo') ? new Date(searchParams.get('dueDateTo')!) : undefined,
      } : undefined,
    };

    // التحقق من طلب الإحصائيات
    if (searchParams.get('stats') === 'true') {
      const stats = await getPurchaseInvoiceStatistics(
        COMPANY_ID,
        filters.dateRange?.from,
        filters.dateRange?.to
      );
      return successResponse(stats);
    }

    // التحقق من طلب فاتورة محددة
    const invoiceId = searchParams.get('id');
    if (invoiceId) {
      const invoice = await getPurchaseInvoiceById(COMPANY_ID, invoiceId);
      if (!invoice) {
        return errorResponse('فاتورة الشراء غير موجودة', 404);
      }
      return successResponse(invoice);
    }

    const result = await getPurchaseInvoices(COMPANY_ID, {
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

    return paginatedResponse(result.invoices, result.total, result.page, result.pageSize);
  } catch (error) {
    logger.error('خطأ في جلب فواتير الشراء', error as Error);
    return errorResponse('خطأ في جلب فواتير الشراء');
  }
}

// ============================================
// POST - إنشاء فاتورة شراء جديدة
// ============================================

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromPurchaseOrder = searchParams.get('fromPurchaseOrder');
    
    // إنشاء فاتورة من أمر شراء
    if (fromPurchaseOrder) {
      const body = await request.json().catch(() => ({}));
      
      const invoice = await createInvoiceFromPurchaseOrder(
        COMPANY_ID,
        USER_ID,
        fromPurchaseOrder,
        {
          supplierInvoiceNo: body.supplierInvoiceNo,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
          notes: body.notes,
        }
      );

      logger.info('تم إنشاء فاتورة من أمر شراء عبر API', {
        purchaseOrderId: fromPurchaseOrder,
        purchaseInvoiceId: invoice.id,
      });

      return successResponse(invoice, 'تم إنشاء الفاتورة من أمر الشراء بنجاح');
    }

    // إنشاء فاتورة عادية
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = createPurchaseInvoiceSchema.safeParse(body);
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
    const invoiceData = {
      ...data,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    // إنشاء الفاتورة
    const purchaseInvoice = await createPurchaseInvoice(COMPANY_ID, USER_ID, invoiceData);

    logger.info('تم إنشاء فاتورة شراء جديدة عبر API', {
      purchaseInvoiceId: purchaseInvoice.id,
      invoiceNo: purchaseInvoice.invoiceNo,
    });

    return successResponse(purchaseInvoice, 'تم إنشاء فاتورة الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء فاتورة الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في إنشاء فاتورة الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PUT - تحديث فاتورة شراء
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseInvoiceId = searchParams.get('id');
    
    if (!purchaseInvoiceId) {
      return errorResponse('معرف فاتورة الشراء مطلوب', 400);
    }

    const body = await request.json();
    
    // التحقق من البيانات
    const validation = updatePurchaseInvoiceSchema.safeParse(body);
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
    const invoiceData = {
      ...data,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    // تحديث الفاتورة
    const purchaseInvoice = await updatePurchaseInvoice(COMPANY_ID, USER_ID, purchaseInvoiceId, invoiceData);

    logger.info('تم تحديث فاتورة الشراء عبر API', { purchaseInvoiceId });

    return successResponse(purchaseInvoice, 'تم تحديث فاتورة الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في تحديث فاتورة الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تحديث فاتورة الشراء';
    return errorResponse(message);
  }
}

// ============================================
// DELETE - حذف فاتورة شراء
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseInvoiceId = searchParams.get('id');
    
    if (!purchaseInvoiceId) {
      return errorResponse('معرف فاتورة الشراء مطلوب', 400);
    }

    await deletePurchaseInvoice(COMPANY_ID, purchaseInvoiceId);

    logger.info('تم حذف فاتورة الشراء عبر API', { purchaseInvoiceId });

    return successResponse(null, 'تم حذف فاتورة الشراء بنجاح');
  } catch (error) {
    logger.error('خطأ في حذف فاتورة الشراء', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في حذف فاتورة الشراء';
    return errorResponse(message);
  }
}

// ============================================
// PATCH - عمليات خاصة (ترحيل، إلغاء)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const purchaseInvoiceId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!purchaseInvoiceId) {
      return errorResponse('معرف فاتورة الشراء مطلوب', 400);
    }

    if (!action) {
      return errorResponse('العملية مطلوبة', 400);
    }

    let result;

    switch (action) {
      case 'post':
        result = await postPurchaseInvoice(COMPANY_ID, USER_ID, purchaseInvoiceId);
        return successResponse(result, 'تم ترحيل فاتورة الشراء بنجاح');

      case 'cancel':
        await cancelPurchaseInvoice(COMPANY_ID, USER_ID, purchaseInvoiceId);
        return successResponse(null, 'تم إلغاء فاتورة الشراء بنجاح');

      default:
        return errorResponse('عملية غير معروفة', 400);
    }
  } catch (error) {
    logger.error('خطأ في تنفيذ العملية', error as Error);
    
    const message = error instanceof Error ? error.message : 'خطأ في تنفيذ العملية';
    return errorResponse(message);
  }
}
