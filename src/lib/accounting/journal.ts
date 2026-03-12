/**
 * Mayas ERP - Journal Service
 * خدمة إدارة القيود المحاسبية
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لإدارة القيود المحاسبية:
 * - إنشاء قيد جديد
 * - تحديث قيد
 * - حذف/إلغاء قيد
 * - ترحيل قيد
 * - جلب قيد واحد
 * - قائمة القيود
 * - البحث في القيود
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  JournalEntryRecord,
  JournalEntryWithRelations,
  JournalLine,
  CreateJournalEntryRequest,
  CreateJournalLineRequest,
  UpdateJournalEntryRequest,
  JournalEntrySearchFilters,
  PaginatedResult,
  JournalEntryStatus,
  JournalSourceType,
} from '@/types/accounting';
import { getAccountByCode, AccountNotFoundError, AccountNotPostableError } from './accounts';

// ============================================
// الأخطاء المخصصة
// ============================================

/** خطأ القيد غير موجود */
export class JournalEntryNotFoundError extends Error {
  constructor(identifier: string) {
    super(`القيد غير موجود: ${identifier}`);
    this.name = 'JournalEntryNotFoundError';
  }
}

/** خطأ عدم توازن القيد */
export class UnbalancedJournalEntryError extends Error {
  constructor(debit: number, credit: number) {
    super(`القيد غير متوازن: المدين ${debit}، الدائن ${credit}`);
    this.name = 'UnbalancedJournalEntryError';
  }
}

/** خطأ القيد مرحل */
export class PostedJournalEntryError extends Error {
  constructor(entryNo: string) {
    super(`لا يمكن تعديل قيد مرحل: ${entryNo}`);
    this.name = 'PostedJournalEntryError';
  }
}

/** خطأ القيد ملغي */
export class CancelledJournalEntryError extends Error {
  constructor(entryNo: string) {
    super(`لا يمكن تعديل قيد ملغي: ${entryNo}`);
    this.name = 'CancelledJournalEntryError';
  }
}

/** خطأ الحساب غير قابل للترحيل */
export class AccountNotPostableInLineError extends Error {
  constructor(accountCode: string) {
    super(`الحساب غير قابل للترحيل: ${accountCode}`);
    this.name = 'AccountNotPostableInLineError';
  }
}

// ============================================
// دوال مساعدة
// ============================================

/** تحويل Decimal إلى number */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value || 0);
}

/** تحويل قيمة إلى Decimal */
function toDecimal(value: number | undefined | null): Prisma.Decimal {
  return new Prisma.Decimal(value || 0);
}

/** توليد رقم القيد */
async function generateEntryNo(companyId: string, branchId: string, date: Date): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // البحث عن آخر قيد في نفس الشركة والفرع والشهر
  const lastEntry = await prisma.journalEntry.findFirst({
    where: {
      companyId,
      branchId,
      entryNo: { startsWith: `JE-${year}${month}` },
    },
    orderBy: { entryNo: 'desc' },
  });

  let sequence = 1;
  if (lastEntry) {
    const lastSequence = parseInt(lastEntry.entryNo.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  return `JE-${year}${month}-${String(sequence).padStart(5, '0')}`;
}

/** التحقق من توازن القيد */
function validateBalance(lines: CreateJournalLineRequest[]): { balanced: boolean; debit: number; credit: number } {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  
  // السماح بفرق بسيط بسبب التقريب
  const diff = Math.abs(totalDebit - totalCredit);
  const balanced = diff < 0.01;
  
  return { balanced, debit: totalDebit, credit: totalCredit };
}

/** بناء شرط البحث من الفلاتر */
function buildWhereClause(
  companyId: string,
  filters?: JournalEntrySearchFilters
): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = {
    companyId,
  };

  if (filters) {
    // البحث النصي
    if (filters.query) {
      where.OR = [
        { entryNo: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // فلاتر التاريخ
    if (filters.entryDateFrom || filters.entryDateTo) {
      where.entryDate = {};
      if (filters.entryDateFrom) where.entryDate.gte = filters.entryDateFrom;
      if (filters.entryDateTo) where.entryDate.lte = filters.entryDateTo;
    }

    // فلاتر مباشرة
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.sourceType) where.sourceType = filters.sourceType;
    if (filters.status) where.status = filters.status;

    // فلتر الحساب (يتطلب البحث في الأسطر)
    if (filters.accountId) {
      where.lines = { some: { accountId: filters.accountId } };
    }

    // فلتر العميل/المورد
    if (filters.customerId || filters.supplierId) {
      where.lines = {
        some: {
          ...(filters.customerId && { customerId: filters.customerId }),
          ...(filters.supplierId && { supplierId: filters.supplierId }),
        },
      };
    }
  }

  return where;
}

// ============================================
// العمليات الأساسية (CRUD)
// ============================================

/**
 * إنشاء قيد محاسبي جديد
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات القيد
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns القيد المُنشأ
 * @throws UnbalancedJournalEntryError إذا كان القيد غير متوازن
 * @throws AccountNotFoundError إذا كان الحساب غير موجود
 * @throws AccountNotPostableError إذا كان الحساب غير قابل للترحيل
 */
export async function createJournalEntry(
  companyId: string,
  data: CreateJournalEntryRequest,
  userId?: string
): Promise<JournalEntryWithRelations> {
  // التحقق من وجود أسطر
  if (!data.lines || data.lines.length === 0) {
    throw new Error('يجب إضافة سطر واحد على الأقل للقيد');
  }

  // التحقق من توازن القيد
  const { balanced, debit, credit } = validateBalance(data.lines);
  if (!balanced) {
    throw new UnbalancedJournalEntryError(debit, credit);
  }

  // التحقق من الحسابات
  for (const line of data.lines) {
    const account = await prisma.account.findFirst({
      where: { id: line.accountId, companyId },
    });

    if (!account) {
      throw new AccountNotFoundError(line.accountId);
    }

    if (!account.isPostable) {
      throw new AccountNotPostableError(account.code);
    }
  }

  // توليد رقم القيد
  const entryNo = await generateEntryNo(companyId, data.branchId, data.entryDate);

  // إنشاء القيد مع الأسطر
  const journalEntry = await prisma.journalEntry.create({
    data: {
      companyId,
      branchId: data.branchId,
      entryNo,
      entryDate: data.entryDate,
      sourceType: data.sourceType || 'manual',
      sourceId: data.sourceId,
      description: data.description,
      totalDebit: toDecimal(debit),
      totalCredit: toDecimal(credit),
      status: 'draft',
      createdById: userId,
      lines: {
        create: data.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: toDecimal(line.debit),
          credit: toDecimal(line.credit),
          customerId: line.customerId,
          supplierId: line.supplierId,
          branchId: line.branchId,
          costCenterId: line.costCenterId,
          referenceNo: line.referenceNo,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  });

  return transformJournalEntry(journalEntry);
}

/**
 * تحديث قيد محاسبي
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @param data - بيانات التحديث
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns القيد المُحدث
 * @throws JournalEntryNotFoundError إذا لم يتم العثور على القيد
 * @throws PostedJournalEntryError إذا كان القيد مرحلاً
 * @throws CancelledJournalEntryError إذا كان القيد ملغياً
 */
export async function updateJournalEntry(
  companyId: string,
  entryId: string,
  data: UpdateJournalEntryRequest,
  userId?: string
): Promise<JournalEntryWithRelations> {
  // التحقق من وجود القيد
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: { lines: true },
  });

  if (!existing) {
    throw new JournalEntryNotFoundError(entryId);
  }

  // التحقق من حالة القيد
  if (existing.status === 'posted') {
    throw new PostedJournalEntryError(existing.entryNo);
  }

  if (existing.status === 'cancelled') {
    throw new CancelledJournalEntryError(existing.entryNo);
  }

  // إذا تم تحديث الأسطر
  let updateData: Prisma.JournalEntryUpdateInput = {};
  
  if (data.lines) {
    // التحقق من توازن القيد
    const { balanced, debit, credit } = validateBalance(data.lines);
    if (!balanced) {
      throw new UnbalancedJournalEntryError(debit, credit);
    }

    // التحقق من الحسابات
    for (const line of data.lines) {
      const account = await prisma.account.findFirst({
        where: { id: line.accountId, companyId },
      });

      if (!account) {
        throw new AccountNotFoundError(line.accountId);
      }

      if (!account.isPostable) {
        throw new AccountNotPostableError(account.code);
      }
    }

    // حذف الأسطر القديمة وإنشاء جديدة
    await prisma.journalEntryLine.deleteMany({
      where: { journalEntryId: entryId },
    });

    // إنشاء الأسطر الجديدة
    for (const line of data.lines) {
      await prisma.journalEntryLine.create({
        data: {
          journalEntryId: entryId,
          accountId: line.accountId,
          description: line.description,
          debit: toDecimal(line.debit),
          credit: toDecimal(line.credit),
          customerId: line.customerId,
          supplierId: line.supplierId,
          branchId: line.branchId,
          costCenterId: line.costCenterId,
          referenceNo: line.referenceNo,
        },
      });
    }

    updateData.totalDebit = toDecimal(debit);
    updateData.totalCredit = toDecimal(credit);
  }

  // تحديث البيانات الأساسية
  if (data.entryDate) updateData.entryDate = data.entryDate;
  if (data.description !== undefined) updateData.description = data.description;

  // تحديث القيد
  const journalEntry = await prisma.journalEntry.update({
    where: { id: entryId },
    data: updateData,
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  });

  return transformJournalEntry(journalEntry);
}

/**
 * حذف قيد (إلغاء)
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns true إذا تم الإلغاء بنجاح
 * @throws JournalEntryNotFoundError إذا لم يتم العثور على القيد
 * @throws PostedJournalEntryError إذا كان القيد مرحلاً
 */
export async function deleteJournalEntry(
  companyId: string,
  entryId: string,
  userId?: string
): Promise<boolean> {
  // التحقق من وجود القيد
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
  });

  if (!existing) {
    throw new JournalEntryNotFoundError(entryId);
  }

  // التحقق من حالة القيد
  if (existing.status === 'posted') {
    throw new PostedJournalEntryError(existing.entryNo);
  }

  // حذف القيد
  await prisma.$transaction([
    prisma.journalEntryLine.deleteMany({ where: { journalEntryId: entryId } }),
    prisma.journalEntry.delete({ where: { id: entryId } }),
  ]);

  return true;
}

/**
 * ترحيل قيد محاسبي
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns القيد المرحل
 * @throws JournalEntryNotFoundError إذا لم يتم العثور على القيد
 * @throws PostedJournalEntryError إذا كان القيد مرحلاً بالفعل
 */
export async function postJournalEntry(
  companyId: string,
  entryId: string,
  userId?: string
): Promise<JournalEntryWithRelations> {
  // التحقق من وجود القيد
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: { lines: true },
  });

  if (!existing) {
    throw new JournalEntryNotFoundError(entryId);
  }

  // التحقق من حالة القيد
  if (existing.status === 'posted') {
    throw new PostedJournalEntryError(existing.entryNo);
  }

  if (existing.status === 'cancelled') {
    throw new CancelledJournalEntryError(existing.entryNo);
  }

  // التحقق من توازن القيد
  const debit = decimalToNumber(existing.totalDebit);
  const credit = decimalToNumber(existing.totalCredit);
  if (Math.abs(debit - credit) >= 0.01) {
    throw new UnbalancedJournalEntryError(debit, credit);
  }

  // ترحيل القيد
  const journalEntry = await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      status: 'posted',
      postedAt: new Date(),
      approvedById: userId,
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  });

  return transformJournalEntry(journalEntry);
}

/**
 * إلغاء قيد مرحل (إنشاء قيد عكسي)
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @param reason - سبب الإلغاء
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns القيد العكسي
 */
export async function reverseJournalEntry(
  companyId: string,
  entryId: string,
  reason: string,
  userId?: string
): Promise<JournalEntryWithRelations> {
  // التحقق من وجود القيد
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: { lines: true },
  });

  if (!existing) {
    throw new JournalEntryNotFoundError(entryId);
  }

  // التحقق من حالة القيد
  if (existing.status !== 'posted') {
    throw new Error('يمكن إلغاء القيود المرحلة فقط');
  }

  // تحديث حالة القيد الأصلي
  await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: 'cancelled' },
  });

  // إنشاء قيد عكسي
  const reversalLines: CreateJournalLineRequest[] = existing.lines.map((line) => ({
    accountId: line.accountId,
    description: `عكس قيد ${existing.entryNo} - ${reason}`,
    debit: decimalToNumber(line.credit),
    credit: decimalToNumber(line.debit),
    customerId: line.customerId || undefined,
    supplierId: line.supplierId || undefined,
    branchId: line.branchId || undefined,
    costCenterId: line.costCenterId || undefined,
    referenceNo: line.referenceNo || undefined,
  }));

  const reversalEntry = await createJournalEntry(
    companyId,
    {
      branchId: existing.branchId,
      entryDate: new Date(),
      description: `قيد عكسي لـ ${existing.entryNo} - ${reason}`,
      sourceType: 'manual',
      lines: reversalLines,
    },
    userId
  );

  // ترحيل القيد العكسي تلقائياً
  return postJournalEntry(companyId, reversalEntry.id, userId);
}

/**
 * جلب قيد واحد بالمعرف
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @returns القيد المطلوب
 * @throws JournalEntryNotFoundError إذا لم يتم العثور على القيد
 */
export async function getJournalEntry(
  companyId: string,
  entryId: string
): Promise<JournalEntryWithRelations> {
  const journalEntry = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  });

  if (!journalEntry) {
    throw new JournalEntryNotFoundError(entryId);
  }

  return transformJournalEntry(journalEntry);
}

/**
 * جلب قيد برقم القيد
 * 
 * @param companyId - معرف الشركة
 * @param entryNo - رقم القيد
 * @returns القيد المطلوب
 * @throws JournalEntryNotFoundError إذا لم يتم العثور على القيد
 */
export async function getJournalEntryByNo(
  companyId: string,
  entryNo: string
): Promise<JournalEntryWithRelations> {
  const journalEntry = await prisma.journalEntry.findFirst({
    where: { companyId, entryNo },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  });

  if (!journalEntry) {
    throw new JournalEntryNotFoundError(entryNo);
  }

  return transformJournalEntry(journalEntry);
}

/**
 * قائمة القيود مع التصفح
 * 
 * @param companyId - معرف الشركة
 * @param params - معايير التصفح
 * @param filters - فلاتر البحث
 * @returns قائمة القيود مع معلومات التصفح
 */
export async function listJournalEntries(
  companyId: string,
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {},
  filters?: JournalEntrySearchFilters
): Promise<PaginatedResult<JournalEntryWithRelations>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'entryDate',
    sortOrder = 'desc',
  } = params;

  const where = buildWhereClause(companyId, filters);

  // حساب العدد الإجمالي
  const total = await prisma.journalEntry.count({ where });

  // جلب البيانات
  const journalEntries = await prisma.journalEntry.findMany({
    where,
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
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
    data: journalEntries.map(transformJournalEntry),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * البحث في القيود
 * 
 * @param companyId - معرف الشركة
 * @param query - نص البحث
 * @param limit - عدد النتائج
 * @returns نتائج البحث
 */
export async function searchJournalEntries(
  companyId: string,
  query: string,
  limit: number = 20
): Promise<JournalEntryWithRelations[]> {
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      OR: [
        { entryNo: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
    take: limit,
    orderBy: { entryDate: 'desc' },
  });

  return journalEntries.map(transformJournalEntry);
}

/**
 * جلب القيود حسب المصدر
 * 
 * @param companyId - معرف الشركة
 * @param sourceType - نوع المصدر
 * @param sourceId - معرف المصدر
 * @returns قائمة القيود
 */
export async function getJournalEntriesBySource(
  companyId: string,
  sourceType: JournalSourceType,
  sourceId: string
): Promise<JournalEntryWithRelations[]> {
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      sourceType,
      sourceId,
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
      branch: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
    orderBy: { entryDate: 'asc' },
  });

  return journalEntries.map(transformJournalEntry);
}

/**
 * التحقق من وجود قيد
 * 
 * @param companyId - معرف الشركة
 * @param entryId - معرف القيد
 * @returns true إذا كان القيد موجوداً
 */
export async function journalEntryExists(companyId: string, entryId: string): Promise<boolean> {
  const count = await prisma.journalEntry.count({
    where: { id: entryId, companyId },
  });

  return count > 0;
}

// ============================================
// دوال التحويل
// ============================================

/** تحويل بيانات القيد من Prisma إلى النوع المطلوب */
function transformJournalEntry(entry: any): JournalEntryWithRelations {
  return {
    id: entry.id,
    companyId: entry.companyId,
    branchId: entry.branchId,
    entryNo: entry.entryNo,
    entryDate: entry.entryDate,
    sourceType: entry.sourceType as JournalSourceType | undefined,
    sourceId: entry.sourceId,
    description: entry.description,
    totalDebit: decimalToNumber(entry.totalDebit),
    totalCredit: decimalToNumber(entry.totalCredit),
    status: entry.status as JournalEntryStatus,
    createdById: entry.createdById,
    approvedById: entry.approvedById,
    createdAt: entry.createdAt,
    postedAt: entry.postedAt,
    lines: entry.lines.map((line: any) => ({
      id: line.id,
      journalEntryId: line.journalEntryId,
      accountId: line.accountId,
      accountCode: line.account?.code,
      accountNameAr: line.account?.nameAr,
      accountNameEn: line.account?.nameEn,
      description: line.description,
      debit: decimalToNumber(line.debit),
      credit: decimalToNumber(line.credit),
      customerId: line.customerId,
      supplierId: line.supplierId,
      branchId: line.branchId,
      costCenterId: line.costCenterId,
      referenceNo: line.referenceNo,
    })),
    branch: entry.branch,
  };
}
