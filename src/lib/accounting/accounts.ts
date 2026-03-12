/**
 * Mayas ERP - Accounts Service
 * خدمة إدارة الحسابات
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لإدارة الدليل المحاسبي:
 * - إنشاء حساب جديد
 * - تحديث حساب
 * - حذف/تعطيل حساب
 * - جلب حساب واحد
 * - شجرة الحسابات
 * - البحث في الحسابات
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  AccountRecord,
  AccountWithRelations,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountSearchFilters,
  PaginatedResult,
  AccountType,
} from '@/types/accounting';

// ============================================
// الأخطاء المخصصة
// ============================================

/** خطأ الحساب غير موجود */
export class AccountNotFoundError extends Error {
  constructor(identifier: string) {
    super(`الحساب غير موجود: ${identifier}`);
    this.name = 'AccountNotFoundError';
  }
}

/** خطأ تكرار الكود */
export class DuplicateAccountCodeError extends Error {
  constructor(code: string) {
    super(`كود الحساب موجود مسبقاً: ${code}`);
    this.name = 'DuplicateAccountCodeError';
  }
}

/** خطأ الحساب غير قابل للترحيل */
export class AccountNotPostableError extends Error {
  constructor(code: string) {
    super(`الحساب غير قابل للترحيل: ${code}`);
    this.name = 'AccountNotPostableError';
  }
}

/** خطأ وجود حسابات فرعية */
export class AccountHasChildrenError extends Error {
  constructor(code: string) {
    super(`لا يمكن حذف الحساب لوجود حسابات فرعية: ${code}`);
    this.name = 'AccountHasChildrenError';
  }
}

/** خطأ وجود قيود مرتبطة */
export class AccountHasJournalLinesError extends Error {
  constructor(code: string) {
    super(`لا يمكن حذف الحساب لوجود قيود محاسبية مرتبطة: ${code}`);
    this.name = 'AccountHasJournalLinesError';
  }
}

// ============================================
// دوال مساعدة
// ============================================

/** تحويل Decimal إلى number */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (!value) return null;
  return Number(value);
}

/** تحويل قيمة إلى Decimal */
function toDecimal(value: number | undefined | null): Prisma.Decimal | undefined {
  if (value === undefined || value === null) return undefined;
  return new Prisma.Decimal(value);
}

/** حساب رقم المستوى من كود الحساب */
function calculateLevelNo(code: string): number {
  // افتراض أن كود الحساب مقسم بنقاط (مثل: 1.1.1)
  if (code.includes('.')) {
    return code.split('.').length;
  }
  // افتراض أن كل رقمين يمثلان مستوى (مثل: 1101 = 1.10.1)
  return Math.ceil(code.length / 2);
}

/** الحصول على كود الحساب الأب */
function getParentCode(code: string): string | null {
  if (code.includes('.')) {
    const parts = code.split('.');
    if (parts.length > 1) {
      parts.pop();
      return parts.join('.');
    }
  } else {
    if (code.length > 2) {
      return code.substring(0, code.length - 2);
    }
  }
  return null;
}

/** بناء شرط البحث من الفلاتر */
function buildWhereClause(
  companyId: string,
  filters?: AccountSearchFilters,
  includeInactive: boolean = false
): Prisma.AccountWhereInput {
  const where: Prisma.AccountWhereInput = {
    companyId,
  };

  if (!includeInactive && !filters?.isActive) {
    where.isActive = true;
  }

  if (filters) {
    // البحث النصي
    if (filters.query) {
      where.OR = [
        { code: { contains: filters.query, mode: 'insensitive' } },
        { nameAr: { contains: filters.query, mode: 'insensitive' } },
        { nameEn: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // فلاتر مباشرة
    if (filters.accountType) where.accountType = filters.accountType;
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId || null;
    }
    if (typeof filters.isPostable === 'boolean') where.isPostable = filters.isPostable;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (filters.levelNo !== undefined) where.levelNo = filters.levelNo;
  }

  return where;
}

// ============================================
// العمليات الأساسية (CRUD)
// ============================================

/**
 * إنشاء حساب جديد
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات الحساب
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns الحساب المُنشأ
 * @throws DuplicateAccountCodeError إذا كان الكود موجوداً مسبقاً
 */
export async function createAccount(
  companyId: string,
  data: CreateAccountRequest,
  userId?: string
): Promise<AccountRecord> {
  // التحقق من عدم تكرار الكود
  const existingByCode = await prisma.account.findFirst({
    where: {
      companyId,
      code: data.code,
    },
  });

  if (existingByCode) {
    throw new DuplicateAccountCodeError(data.code);
  }

  // حساب رقم المستوى
  const levelNo = calculateLevelNo(data.code);

  // البحث عن الحساب الأب
  let parentId = data.parentId;
  if (!parentId && levelNo > 1) {
    const parentCode = getParentCode(data.code);
    if (parentCode) {
      const parent = await prisma.account.findFirst({
        where: { companyId, code: parentCode },
      });
      if (parent) {
        parentId = parent.id;
      }
    }
  }

  // إنشاء الحساب
  const account = await prisma.account.create({
    data: {
      companyId,
      code: data.code,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      parentId: parentId || null,
      accountType: data.accountType,
      levelNo,
      isPostable: data.isPostable ?? true,
      currencyControl: data.currencyControl ?? false,
      branchTracking: data.branchTracking ?? false,
      costCenterTracking: data.costCenterTracking ?? false,
      isActive: data.isActive ?? true,
    },
  });

  return account as AccountRecord;
}

/**
 * تحديث حساب موجود
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @param data - بيانات التحديث
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns الحساب المُحدث
 * @throws AccountNotFoundError إذا لم يتم العثور على الحساب
 * @throws DuplicateAccountCodeError إذا كان الكود الجديد موجوداً مسبقاً
 */
export async function updateAccount(
  companyId: string,
  accountId: string,
  data: UpdateAccountRequest,
  userId?: string
): Promise<AccountRecord> {
  // التحقق من وجود الحساب
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      companyId,
    },
  });

  if (!existing) {
    throw new AccountNotFoundError(accountId);
  }

  // التحقق من عدم تكرار الكود إذا تم تغييره
  if (data.code && data.code !== existing.code) {
    const duplicateCode = await prisma.account.findFirst({
      where: {
        companyId,
        code: data.code,
        id: { not: accountId },
      },
    });

    if (duplicateCode) {
      throw new DuplicateAccountCodeError(data.code);
    }
  }

  // التحقق من تغيير نوع الحساب إذا كان لديه أبناء
  if (data.accountType && data.accountType !== existing.accountType) {
    const childrenCount = await prisma.account.count({
      where: { parentId: accountId },
    });

    if (childrenCount > 0) {
      throw new Error('لا يمكن تغيير نوع الحساب لوجود حسابات فرعية');
    }
  }

  // تحديث الحساب
  const updateData: Prisma.AccountUpdateInput = {
    ...(data.code && { code: data.code }),
    ...(data.nameAr && { nameAr: data.nameAr }),
    ...(data.nameEn && { nameEn: data.nameEn }),
    ...(data.parentId !== undefined && { parent: data.parentId ? { connect: { id: data.parentId } } : { disconnect: true } }),
    ...(data.accountType && { accountType: data.accountType }),
    ...(data.isPostable !== undefined && { isPostable: data.isPostable }),
    ...(data.currencyControl !== undefined && { currencyControl: data.currencyControl }),
    ...(data.branchTracking !== undefined && { branchTracking: data.branchTracking }),
    ...(data.costCenterTracking !== undefined && { costCenterTracking: data.costCenterTracking }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  };

  // إعادة حساب رقم المستوى إذا تغير الكود
  if (data.code) {
    updateData.levelNo = calculateLevelNo(data.code);
  }

  const account = await prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });

  return account as AccountRecord;
}

/**
 * حذف حساب (تعطيل)
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns true إذا تم الحذف بنجاح
 * @throws AccountNotFoundError إذا لم يتم العثور على الحساب
 * @throws AccountHasChildrenError إذا كان لديه حسابات فرعية
 * @throws AccountHasJournalLinesError إذا كان لديه قيود محاسبية
 */
export async function deleteAccount(
  companyId: string,
  accountId: string,
  userId?: string
): Promise<boolean> {
  // التحقق من وجود الحساب
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      companyId,
    },
  });

  if (!existing) {
    throw new AccountNotFoundError(accountId);
  }

  // التحقق من عدم وجود حسابات فرعية
  const childrenCount = await prisma.account.count({
    where: { parentId: accountId },
  });

  if (childrenCount > 0) {
    throw new AccountHasChildrenError(existing.code);
  }

  // التحقق من عدم وجود قيود محاسبية
  const journalLinesCount = await prisma.journalEntryLine.count({
    where: { accountId },
  });

  if (journalLinesCount > 0) {
    throw new AccountHasJournalLinesError(existing.code);
  }

  // تعطيل الحساب (soft delete)
  await prisma.account.update({
    where: { id: accountId },
    data: { isActive: false },
  });

  return true;
}

/**
 * حذف حساب نهائياً (hard delete)
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @returns true إذا تم الحذف بنجاح
 */
export async function deleteAccountPermanently(
  companyId: string,
  accountId: string
): Promise<boolean> {
  // التحقق من وجود الحساب
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      companyId,
    },
  });

  if (!existing) {
    throw new AccountNotFoundError(accountId);
  }

  // التحقق من عدم وجود حسابات فرعية
  const childrenCount = await prisma.account.count({
    where: { parentId: accountId },
  });

  if (childrenCount > 0) {
    throw new AccountHasChildrenError(existing.code);
  }

  // التحقق من عدم وجود قيود محاسبية
  const journalLinesCount = await prisma.journalEntryLine.count({
    where: { accountId },
  });

  if (journalLinesCount > 0) {
    throw new AccountHasJournalLinesError(existing.code);
  }

  // حذف الحساب
  await prisma.account.delete({
    where: { id: accountId },
  });

  return true;
}

/**
 * جلب حساب واحد بالمعرف
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @param includeRelations - تضمين العلاقات
 * @returns الحساب المطلوب
 * @throws AccountNotFoundError إذا لم يتم العثور على الحساب
 */
export async function getAccount(
  companyId: string,
  accountId: string,
  includeRelations: boolean = false
): Promise<AccountRecord | AccountWithRelations> {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      companyId,
    },
    include: includeRelations
      ? {
          parent: true,
          children: true,
          _count: {
            select: {
              journalLines: true,
            },
          },
        }
      : undefined,
  });

  if (!account) {
    throw new AccountNotFoundError(accountId);
  }

  return account as AccountRecord | AccountWithRelations;
}

/**
 * جلب حساب بالكود
 * 
 * @param companyId - معرف الشركة
 * @param code - كود الحساب
 * @param includeRelations - تضمين العلاقات
 * @returns الحساب المطلوب
 * @throws AccountNotFoundError إذا لم يتم العثور على الحساب
 */
export async function getAccountByCode(
  companyId: string,
  code: string,
  includeRelations: boolean = false
): Promise<AccountRecord | AccountWithRelations> {
  const account = await prisma.account.findFirst({
    where: {
      companyId,
      code,
    },
    include: includeRelations
      ? {
          parent: true,
          children: true,
          _count: {
            select: {
              journalLines: true,
            },
          },
        }
      : undefined,
  });

  if (!account) {
    throw new AccountNotFoundError(code);
  }

  return account as AccountRecord | AccountWithRelations;
}

/**
 * جلب شجرة الحسابات
 * 
 * @param companyId - معرف الشركة
 * @param accountType - نوع الحساب (اختياري)
 * @param includeInactive - تضمين الحسابات غير النشطة
 * @returns شجرة الحسابات
 */
export async function getAccountsTree(
  companyId: string,
  accountType?: AccountType,
  includeInactive: boolean = false
): Promise<AccountWithRelations[]> {
  const where: Prisma.AccountWhereInput = {
    companyId,
    ...(accountType && { accountType }),
    ...(includeInactive ? {} : { isActive: true }),
  };

  // جلب جميع الحسابات
  const accounts = await prisma.account.findMany({
    where,
    include: {
      parent: true,
      children: {
        where: includeInactive ? undefined : { isActive: true },
      },
      _count: {
        select: {
          journalLines: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  // بناء الشجرة - الحسابات الجذرية فقط
  const rootAccounts = accounts.filter((a) => !a.parentId);

  return rootAccounts as AccountWithRelations[];
}

/**
 * جلب الحسابات المسطحة
 * 
 * @param companyId - معرف الشركة
 * @param filters - فلاتر البحث
 * @returns قائمة الحسابات
 */
export async function listAccounts(
  companyId: string,
  filters?: AccountSearchFilters,
  includeInactive: boolean = false
): Promise<AccountRecord[]> {
  const where = buildWhereClause(companyId, filters, includeInactive);

  const accounts = await prisma.account.findMany({
    where,
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  return accounts as AccountRecord[];
}

/**
 * قائمة الحسابات مع التصفح
 * 
 * @param companyId - معرف الشركة
 * @param params - معايير التصفح
 * @param filters - فلاتر البحث
 * @returns قائمة الحسابات مع معلومات التصفح
 */
export async function listAccountsPaginated(
  companyId: string,
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeInactive?: boolean;
  } = {},
  filters?: AccountSearchFilters
): Promise<PaginatedResult<AccountWithRelations>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'code',
    sortOrder = 'asc',
    includeInactive = false,
  } = params;

  const where = buildWhereClause(companyId, filters, includeInactive);

  // حساب العدد الإجمالي
  const total = await prisma.account.count({ where });

  // جلب البيانات
  const accounts = await prisma.account.findMany({
    where,
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
        },
      },
      _count: {
        select: {
          journalLines: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    data: accounts as AccountWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * البحث في الحسابات
 * 
 * @param companyId - معرف الشركة
 * @param query - نص البحث
 * @param limit - عدد النتائج
 * @returns نتائج البحث
 */
export async function searchAccounts(
  companyId: string,
  query: string,
  limit: number = 20
): Promise<AccountRecord[]> {
  const accounts = await prisma.account.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { nameAr: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      parent: {
        select: {
          code: true,
          nameAr: true,
        },
      },
    },
    take: limit,
    orderBy: { code: 'asc' },
  });

  return accounts as AccountRecord[];
}

/**
 * جلب الحسابات القابلة للترحيل
 * 
 * @param companyId - معرف الشركة
 * @param accountType - نوع الحساب (اختياري)
 * @returns قائمة الحسابات القابلة للترحيل
 */
export async function getPostableAccounts(
  companyId: string,
  accountType?: AccountType
): Promise<AccountRecord[]> {
  const accounts = await prisma.account.findMany({
    where: {
      companyId,
      isPostable: true,
      isActive: true,
      ...(accountType && { accountType }),
    },
    orderBy: { code: 'asc' },
  });

  return accounts as AccountRecord[];
}

/**
 * التحقق من وجود حساب
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @returns true إذا كان الحساب موجوداً
 */
export async function accountExists(companyId: string, accountId: string): Promise<boolean> {
  const count = await prisma.account.count({
    where: {
      id: accountId,
      companyId,
    },
  });

  return count > 0;
}

/**
 * جلب رصيد حساب
 * 
 * @param companyId - معرف الشركة
 * @param accountId - معرف الحساب
 * @param dateTo - تاريخ النهاية (اختياري)
 * @returns رصيد الحساب
 */
export async function getAccountBalance(
  companyId: string,
  accountId: string,
  dateTo?: Date
): Promise<number> {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      companyId,
    },
  });

  if (!account) {
    throw new AccountNotFoundError(accountId);
  }

  // بناء شرط البحث
  const where: Prisma.JournalEntryLineWhereInput = {
    accountId,
    journalEntry: {
      companyId,
      status: 'posted',
      ...(dateTo && { entryDate: { lte: dateTo } }),
    },
  };

  // حساب مجموع المدين والدائن
  const result = await prisma.journalEntryLine.aggregate({
    where,
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const totalDebit = Number(result._sum.debit || 0);
  const totalCredit = Number(result._sum.credit || 0);

  // تحديد الرصيد بناءً على نوع الحساب
  const debitTypes: AccountType[] = ['asset', 'expense'];
  if (debitTypes.includes(account.accountType as AccountType)) {
    return totalDebit - totalCredit;
  } else {
    return totalCredit - totalDebit;
  }
}

/**
 * إنشاء شجرة الحسابات الافتراضية
 * 
 * @param companyId - معرف الشركة
 * @param userId - معرف المستخدم
 * @returns عدد الحسابات المُنشأة
 */
export async function createDefaultChartOfAccounts(
  companyId: string,
  userId?: string
): Promise<number> {
  // التحقق من عدم وجود حسابات مسبقة
  const existingCount = await prisma.account.count({
    where: { companyId },
  });

  if (existingCount > 0) {
    throw new Error('يوجد حسابات مسبقة، لا يمكن إنشاء الدليل الافتراضي');
  }

  // الدليل المحاسبي الافتراضي
  const defaultAccounts = [
    // الأصول
    { code: '1', nameAr: 'الأصول', nameEn: 'Assets', accountType: 'asset' as AccountType, levelNo: 1, isPostable: false },
    { code: '11', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', accountType: 'asset' as AccountType, levelNo: 2, isPostable: false },
    { code: '111', nameAr: 'النقدية والبنوك', nameEn: 'Cash and Banks', accountType: 'asset' as AccountType, levelNo: 3, isPostable: false },
    { code: '1111', nameAr: 'الصندوق', nameEn: 'Cash', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    { code: '1112', nameAr: 'البنك', nameEn: 'Bank', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    { code: '112', nameAr: 'الذمم المدينة', nameEn: 'Accounts Receivable', accountType: 'asset' as AccountType, levelNo: 3, isPostable: false },
    { code: '1121', nameAr: 'العملاء', nameEn: 'Customers', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    { code: '113', nameAr: 'المخزون', nameEn: 'Inventory', accountType: 'asset' as AccountType, levelNo: 3, isPostable: false },
    { code: '1131', nameAr: 'مخزون البضاعة', nameEn: 'Stock Inventory', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    { code: '12', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', accountType: 'asset' as AccountType, levelNo: 2, isPostable: false },
    { code: '121', nameAr: 'الأصول الثابتة الملموسة', nameEn: 'Tangible Fixed Assets', accountType: 'asset' as AccountType, levelNo: 3, isPostable: false },
    { code: '1211', nameAr: 'المباني', nameEn: 'Buildings', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    { code: '1212', nameAr: 'الآلات والمعدات', nameEn: 'Machinery and Equipment', accountType: 'asset' as AccountType, levelNo: 4, isPostable: true },
    
    // الخصوم
    { code: '2', nameAr: 'الخصوم', nameEn: 'Liabilities', accountType: 'liability' as AccountType, levelNo: 1, isPostable: false },
    { code: '21', nameAr: 'الخصوم المتداولة', nameEn: 'Current Liabilities', accountType: 'liability' as AccountType, levelNo: 2, isPostable: false },
    { code: '211', nameAr: 'الذمم الدائنة', nameEn: 'Accounts Payable', accountType: 'liability' as AccountType, levelNo: 3, isPostable: false },
    { code: '2111', nameAr: 'الموردون', nameEn: 'Suppliers', accountType: 'liability' as AccountType, levelNo: 4, isPostable: true },
    { code: '212', nameAr: 'الضرائب المستحقة', nameEn: 'Taxes Payable', accountType: 'liability' as AccountType, levelNo: 3, isPostable: false },
    { code: '2121', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable', accountType: 'liability' as AccountType, levelNo: 4, isPostable: true },
    
    // حقوق الملكية
    { code: '3', nameAr: 'حقوق الملكية', nameEn: 'Equity', accountType: 'equity' as AccountType, levelNo: 1, isPostable: false },
    { code: '31', nameAr: 'رأس المال', nameEn: 'Capital', accountType: 'equity' as AccountType, levelNo: 2, isPostable: true },
    { code: '32', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', accountType: 'equity' as AccountType, levelNo: 2, isPostable: true },
    
    // الإيرادات
    { code: '4', nameAr: 'الإيرادات', nameEn: 'Revenue', accountType: 'revenue' as AccountType, levelNo: 1, isPostable: false },
    { code: '41', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', accountType: 'revenue' as AccountType, levelNo: 2, isPostable: false },
    { code: '411', nameAr: 'مبيعات البضاعة', nameEn: 'Sales', accountType: 'revenue' as AccountType, levelNo: 3, isPostable: true },
    { code: '42', nameAr: 'المبيعات المرتجعة', nameEn: 'Sales Returns', accountType: 'revenue' as AccountType, levelNo: 2, isPostable: false },
    { code: '421', nameAr: 'مرتجع المبيعات', nameEn: 'Sales Returns', accountType: 'revenue' as AccountType, levelNo: 3, isPostable: true },
    
    // المصروفات
    { code: '5', nameAr: 'المصروفات', nameEn: 'Expenses', accountType: 'expense' as AccountType, levelNo: 1, isPostable: false },
    { code: '51', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', accountType: 'expense' as AccountType, levelNo: 2, isPostable: true },
    { code: '52', nameAr: 'مصروفات التشغيل', nameEn: 'Operating Expenses', accountType: 'expense' as AccountType, levelNo: 2, isPostable: false },
    { code: '521', nameAr: 'مصروفات الرواتب', nameEn: 'Salaries Expense', accountType: 'expense' as AccountType, levelNo: 3, isPostable: true },
    { code: '522', nameAr: 'مصروفات الإيجار', nameEn: 'Rent Expense', accountType: 'expense' as AccountType, levelNo: 3, isPostable: true },
    { code: '523', nameAr: 'مصروفات الخدمات', nameEn: 'Utilities Expense', accountType: 'expense' as AccountType, levelNo: 3, isPostable: true },
  ];

  // إنشاء الحسابات
  let createdCount = 0;
  for (const accountData of defaultAccounts) {
    // البحث عن الحساب الأب
    let parentId: string | undefined;
    if (accountData.levelNo > 1) {
      const parentCode = getParentCode(accountData.code);
      if (parentCode) {
        const parent = await prisma.account.findFirst({
          where: { companyId, code: parentCode },
        });
        if (parent) {
          parentId = parent.id;
        }
      }
    }

    await prisma.account.create({
      data: {
        companyId,
        code: accountData.code,
        nameAr: accountData.nameAr,
        nameEn: accountData.nameEn,
        parentId: parentId || null,
        accountType: accountData.accountType,
        levelNo: accountData.levelNo,
        isPostable: accountData.isPostable,
        currencyControl: false,
        branchTracking: false,
        costCenterTracking: false,
        isActive: true,
      },
    });
    createdCount++;
  }

  return createdCount;
}
