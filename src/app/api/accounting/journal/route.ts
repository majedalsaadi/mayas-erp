/**
 * Mayas ERP - Journal API
 * واجهة برمجة التطبيقات للقيود المحاسبية
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  getJournalEntry,
  listJournalEntries,
  searchJournalEntries,
  JournalEntryNotFoundError,
  UnbalancedJournalEntryError,
  PostedJournalEntryError,
  CancelledJournalEntryError,
} from '@/lib/accounting/journal';
import { AccountNotFoundError, AccountNotPostableError } from '@/lib/accounting/accounts';

// ============================================
// مخططات التحقق
// ============================================

const journalLineSchema = z.object({
  accountId: z.string().uuid('معرف الحساب غير صحيح'),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  branchId: z.string().optional(),
  costCenterId: z.string().optional(),
  referenceNo: z.string().optional(),
}).refine((data) => data.debit > 0 || data.credit > 0, {
  message: 'يجب تحديد قيمة المدين أو الدائن',
});

const createJournalEntrySchema = z.object({
  branchId: z.string().uuid('معرف الفرع غير صحيح'),
  entryDate: z.coerce.date(),
  description: z.string().optional(),
  sourceType: z.enum([
    'manual',
    'sales_invoice',
    'purchase_invoice',
    'sales_return',
    'purchase_return',
    'payment',
    'receipt',
    'inventory_adjust',
    'depreciation',
    'period_close',
    'opening_balance',
  ]).optional(),
  sourceId: z.string().optional(),
  lines: z.array(journalLineSchema).min(1, 'يجب إضافة سطر واحد على الأقل'),
}).refine((data) => {
  // التحقق من توازن القيد
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
  message: 'القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن',
});

const updateJournalEntrySchema = z.object({
  entryDate: z.coerce.date().optional(),
  description: z.string().optional(),
  lines: z.array(journalLineSchema).min(1).optional(),
}).refine((data) => {
  if (!data.lines) return true;
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
  message: 'القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن',
});

const listJournalEntriesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('entryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  query: z.string().optional(),
  entryDateFrom: z.coerce.date().optional(),
  entryDateTo: z.coerce.date().optional(),
  branchId: z.string().optional(),
  sourceType: z.string().optional(),
  status: z.enum(['draft', 'pending', 'posted', 'cancelled']).optional(),
  accountId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
});

// ============================================
// GET - جلب القيود
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const companyId = request.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من المعايير
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = listJournalEntriesSchema.parse(queryParams);

    // البحث أو القائمة
    if (validatedParams.query) {
      const entries = await searchJournalEntries(
        companyId,
        validatedParams.query,
        validatedParams.pageSize
      );
      return NextResponse.json({
        success: true,
        data: entries,
        total: entries.length,
      });
    }

    // قائمة مع التصفح
    const result = await listJournalEntries(
      companyId,
      {
        page: validatedParams.page,
        pageSize: validatedParams.pageSize,
        sortBy: validatedParams.sortBy,
        sortOrder: validatedParams.sortOrder,
      },
      {
        entryDateFrom: validatedParams.entryDateFrom,
        entryDateTo: validatedParams.entryDateTo,
        branchId: validatedParams.branchId,
        sourceType: validatedParams.sourceType as any,
        status: validatedParams.status,
        accountId: validatedParams.accountId,
        customerId: validatedParams.customerId,
        supplierId: validatedParams.supplierId,
      }
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('خطأ في جلب القيود:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - إنشاء قيد جديد
// ============================================

export async function POST(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    const userId = request.headers.get('x-user-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createJournalEntrySchema.parse(body);

    const journalEntry = await createJournalEntry(
      companyId,
      validatedData,
      userId || undefined
    );

    return NextResponse.json({
      success: true,
      data: journalEntry,
      message: 'تم إنشاء القيد بنجاح',
    }, { status: 201 });
  } catch (error) {
    console.error('خطأ في إنشاء القيد:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof UnbalancedJournalEntryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof AccountNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof AccountNotPostableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - تحديث/ترحيل/إلغاء قيد
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    const userId = request.headers.get('x-user-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { entryId, action, ...data } = body;

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'معرف القيد مطلوب' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update': {
        const validatedData = updateJournalEntrySchema.parse(data);
        const journalEntry = await updateJournalEntry(
          companyId,
          entryId,
          validatedData,
          userId || undefined
        );
        return NextResponse.json({
          success: true,
          data: journalEntry,
          message: 'تم تحديث القيد بنجاح',
        });
      }

      case 'post': {
        const journalEntry = await postJournalEntry(
          companyId,
          entryId,
          userId || undefined
        );
        return NextResponse.json({
          success: true,
          data: journalEntry,
          message: 'تم ترحيل القيد بنجاح',
        });
      }

      case 'reverse': {
        const { reason } = data;
        if (!reason) {
          return NextResponse.json(
            { success: false, error: 'سبب الإلغاء مطلوب' },
            { status: 400 }
          );
        }
        const journalEntry = await reverseJournalEntry(
          companyId,
          entryId,
          reason,
          userId || undefined
        );
        return NextResponse.json({
          success: true,
          data: journalEntry,
          message: 'تم إلغاء القيد وإنشاء قيد عكسي',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'إجراء غير معروف' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('خطأ في تحديث القيد:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof JournalEntryNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof PostedJournalEntryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof CancelledJournalEntryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof UnbalancedJournalEntryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - حذف قيد
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    const userId = request.headers.get('x-user-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'معرف القيد مطلوب' },
        { status: 400 }
      );
    }

    await deleteJournalEntry(companyId, entryId, userId || undefined);

    return NextResponse.json({
      success: true,
      message: 'تم حذف القيد بنجاح',
    });
  } catch (error) {
    console.error('خطأ في حذف القيد:', error);

    if (error instanceof JournalEntryNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof PostedJournalEntryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
