/**
 * Mayas ERP - Accounts API
 * واجهة برمجة التطبيقات للحسابات
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAccount,
  listAccountsPaginated,
  searchAccounts,
  getAccountsTree,
  getPostableAccounts,
  createDefaultChartOfAccounts,
  AccountNotFoundError,
  DuplicateAccountCodeError,
} from '@/lib/accounting/accounts';

// ============================================
// مخططات التحقق
// ============================================

const createAccountSchema = z.object({
  code: z.string().min(1, 'كود الحساب مطلوب'),
  nameAr: z.string().min(1, 'الاسم العربي مطلوب'),
  nameEn: z.string().min(1, 'الاسم الإنجليزي مطلوب'),
  parentId: z.string().optional(),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  isPostable: z.boolean().optional(),
  currencyControl: z.boolean().optional(),
  branchTracking: z.boolean().optional(),
  costCenterTracking: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const listAccountsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeInactive: z.coerce.boolean().default(false),
  query: z.string().optional(),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  isPostable: z.coerce.boolean().optional(),
  view: z.enum(['list', 'tree', 'postable']).optional(),
});

// ============================================
// GET - جلب الحسابات
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // استخراج معرف الشركة من الجلسة أو الـ header
    const companyId = request.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من المعايير
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = listAccountsSchema.parse(queryParams);

    // تحديد نوع العرض
    if (validatedParams.view === 'tree') {
      // شجرة الحسابات
      const tree = await getAccountsTree(
        companyId,
        validatedParams.accountType,
        validatedParams.includeInactive
      );
      return NextResponse.json({
        success: true,
        data: tree,
      });
    }

    if (validatedParams.view === 'postable') {
      // الحسابات القابلة للترحيل
      const accounts = await getPostableAccounts(
        companyId,
        validatedParams.accountType
      );
      return NextResponse.json({
        success: true,
        data: accounts,
      });
    }

    // البحث أو القائمة
    if (validatedParams.query) {
      const accounts = await searchAccounts(
        companyId,
        validatedParams.query,
        validatedParams.pageSize
      );
      return NextResponse.json({
        success: true,
        data: accounts,
        total: accounts.length,
      });
    }

    // قائمة مع التصفح
    const result = await listAccountsPaginated(
      companyId,
      {
        page: validatedParams.page,
        pageSize: validatedParams.pageSize,
        sortBy: validatedParams.sortBy,
        sortOrder: validatedParams.sortOrder,
        includeInactive: validatedParams.includeInactive,
      },
      {
        accountType: validatedParams.accountType,
        isPostable: validatedParams.isPostable,
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
    console.error('خطأ في جلب الحسابات:', error);
    
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
// POST - إنشاء حساب جديد
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
    const validatedData = createAccountSchema.parse(body);

    const account = await createAccount(companyId, validatedData, userId || undefined);

    return NextResponse.json({
      success: true,
      data: account,
      message: 'تم إنشاء الحساب بنجاح',
    }, { status: 201 });
  } catch (error) {
    console.error('خطأ في إنشاء الحساب:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof DuplicateAccountCodeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================
// إجراءات إضافية
// ============================================

export async function PUT(request: NextRequest) {
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

    // إنشاء الدليل المحاسبي الافتراضي
    if (body.action === 'createDefaultChart') {
      const count = await createDefaultChartOfAccounts(companyId, userId || undefined);
      return NextResponse.json({
        success: true,
        message: `تم إنشاء ${count} حساب بنجاح`,
        data: { count },
      });
    }

    return NextResponse.json(
      { success: false, error: 'إجراء غير معروف' },
      { status: 400 }
    );
  } catch (error) {
    console.error('خطأ في تنفيذ الإجراء:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
