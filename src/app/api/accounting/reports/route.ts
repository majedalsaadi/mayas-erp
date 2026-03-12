/**
 * Mayas ERP - Accounting Reports API
 * واجهة برمجة التطبيقات للتقارير المحاسبية
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import type { AccountType, TrialBalance, IncomeStatement, BalanceSheet, AccountLedger } from '@/types/accounting';

// ============================================
// مخططات التحقق
// ============================================

const reportCriteriaSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  branchId: z.string().optional(),
  costCenterId: z.string().optional(),
  includeOpening: z.coerce.boolean().default(true),
  accountId: z.string().optional(),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  levelFrom: z.coerce.number().min(1).max(10).optional(),
  levelTo: z.coerce.number().min(1).max(10).optional(),
});

const reportRequestSchema = z.object({
  reportType: z.enum(['trial-balance', 'income-statement', 'balance-sheet', 'account-ledger']),
  criteria: reportCriteriaSchema,
});

// ============================================
// دوال مساعدة
// ============================================

/** تحويل Decimal إلى number */
function toNumber(value: any): number {
  return Number(value || 0);
}

/** حساب رصيد الحساب */
async function calculateAccountBalance(
  companyId: string,
  accountId: string,
  dateFrom?: Date,
  dateTo?: Date,
  branchId?: string
): Promise<{ debit: number; credit: number }> {
  const whereClause: any = {
    accountId,
    journalEntry: {
      companyId,
      status: 'posted',
    },
  };

  if (dateTo) {
    whereClause.journalEntry.entryDate = { lte: dateTo };
  }

  if (branchId) {
    whereClause.journalEntry.branchId = branchId;
  }

  const result = await prisma.journalEntryLine.aggregate({
    where: whereClause,
    _sum: {
      debit: true,
      credit: true,
    },
  });

  return {
    debit: toNumber(result._sum.debit),
    credit: toNumber(result._sum.credit),
  };
}

/** حساب رصيد الفترة السابقة */
async function calculateOpeningBalance(
  companyId: string,
  accountId: string,
  dateFrom: Date,
  branchId?: string
): Promise<{ debit: number; credit: number }> {
  const whereClause: any = {
    accountId,
    journalEntry: {
      companyId,
      status: 'posted',
      entryDate: { lt: dateFrom },
    },
  };

  if (branchId) {
    whereClause.journalEntry.branchId = branchId;
  }

  const result = await prisma.journalEntryLine.aggregate({
    where: whereClause,
    _sum: {
      debit: true,
      credit: true,
    },
  });

  return {
    debit: toNumber(result._sum.debit),
    credit: toNumber(result._sum.credit),
  };
}

// ============================================
// التقارير
// ============================================

/**
 * ميزان المراجعة
 */
async function generateTrialBalance(
  companyId: string,
  criteria: z.infer<typeof reportCriteriaSchema>
): Promise<TrialBalance> {
  // جلب جميع الحسابات
  const accounts = await prisma.account.findMany({
    where: {
      companyId,
      isActive: true,
      ...(criteria.accountType && { accountType: criteria.accountType }),
      ...(criteria.levelFrom !== undefined && { levelNo: { gte: criteria.levelFrom } }),
      ...(criteria.levelTo !== undefined && { levelNo: { lte: criteria.levelTo } }),
    },
    orderBy: { code: 'asc' },
  });

  const items: any[] = [];
  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  for (const account of accounts) {
    // حساب الأرصدة
    let openingDebit = 0;
    let openingCredit = 0;

    if (criteria.includeOpening) {
      const opening = await calculateOpeningBalance(
        companyId,
        account.id,
        criteria.dateFrom,
        criteria.branchId
      );
      openingDebit = opening.debit;
      openingCredit = opening.credit;
    }

    const period = await calculateAccountBalance(
      companyId,
      account.id,
      criteria.dateFrom,
      criteria.dateTo,
      criteria.branchId
    );

    // حساب الرصيد الختامي
    const closingDebit = openingDebit + period.debit;
    const closingCredit = openingCredit + period.credit;

    // تجاهل الحسابات بدون رصيد
    if (openingDebit === 0 && openingCredit === 0 && 
        period.debit === 0 && period.credit === 0) {
      continue;
    }

    items.push({
      accountId: account.id,
      accountCode: account.code,
      accountNameAr: account.nameAr,
      accountNameEn: account.nameEn,
      accountType: account.accountType as AccountType,
      levelNo: account.levelNo,
      parentId: account.parentId,
      openingDebit,
      openingCredit,
      periodDebit: period.debit,
      periodCredit: period.credit,
      closingDebit,
      closingCredit,
    });

    totalOpeningDebit += openingDebit;
    totalOpeningCredit += openingCredit;
    totalPeriodDebit += period.debit;
    totalPeriodCredit += period.credit;
    totalClosingDebit += closingDebit;
    totalClosingCredit += closingCredit;
  }

  return {
    items,
    totalOpeningDebit,
    totalOpeningCredit,
    totalPeriodDebit,
    totalPeriodCredit,
    totalClosingDebit,
    totalClosingCredit,
    isBalanced: Math.abs(totalClosingDebit - totalClosingCredit) < 0.01,
  };
}

/**
 * قائمة الدخل
 */
async function generateIncomeStatement(
  companyId: string,
  criteria: z.infer<typeof reportCriteriaSchema>
): Promise<IncomeStatement> {
  // جلب حسابات الإيرادات
  const revenueAccounts = await prisma.account.findMany({
    where: {
      companyId,
      accountType: 'revenue',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // جلب حسابات المصروفات
  const expenseAccounts = await prisma.account.findMany({
    where: {
      companyId,
      accountType: 'expense',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  const revenues: any[] = [];
  const expenses: any[] = [];
  let totalRevenues = 0;
  let totalExpenses = 0;

  // حساب الإيرادات
  for (const account of revenueAccounts) {
    const balance = await calculateAccountBalance(
      companyId,
      account.id,
      criteria.dateFrom,
      criteria.dateTo,
      criteria.branchId
    );

    // الإيرادات: الرصيد الدائن
    const amount = balance.credit - balance.debit;
    if (amount !== 0) {
      revenues.push({
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.nameAr,
        accountNameEn: account.nameEn,
        amount: Math.abs(amount),
      });
      totalRevenues += Math.abs(amount);
    }
  }

  // حساب المصروفات
  for (const account of expenseAccounts) {
    const balance = await calculateAccountBalance(
      companyId,
      account.id,
      criteria.dateFrom,
      criteria.dateTo,
      criteria.branchId
    );

    // المصروفات: الرصيد المدين
    const amount = balance.debit - balance.credit;
    if (amount !== 0) {
      expenses.push({
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.nameAr,
        accountNameEn: account.nameEn,
        amount: Math.abs(amount),
      });
      totalExpenses += Math.abs(amount);
    }
  }

  // حساب النسب المئوية
  revenues.forEach((item) => {
    item.percentage = totalRevenues > 0 ? (item.amount / totalRevenues) * 100 : 0;
  });

  expenses.forEach((item) => {
    item.percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
  });

  // حساب مجمل الربح (الإيرادات - تكلفة البضاعة المباعة)
  const grossProfit = totalRevenues - totalExpenses;
  const netIncome = grossProfit;

  return {
    revenues,
    totalRevenues,
    expenses,
    totalExpenses,
    grossProfit,
    netIncome,
  };
}

/**
 * الميزانية العمومية
 */
async function generateBalanceSheet(
  companyId: string,
  criteria: z.infer<typeof reportCriteriaSchema>
): Promise<BalanceSheet> {
  // جلب حسابات الأصول
  const assetAccounts = await prisma.account.findMany({
    where: {
      companyId,
      accountType: 'asset',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // جلب حسابات الخصوم
  const liabilityAccounts = await prisma.account.findMany({
    where: {
      companyId,
      accountType: 'liability',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // جلب حسابات حقوق الملكية
  const equityAccounts = await prisma.account.findMany({
    where: {
      companyId,
      accountType: 'equity',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  const currentAssets: any[] = [];
  const fixedAssets: any[] = [];
  const currentLiabilities: any[] = [];
  const longTermLiabilities: any[] = [];
  const equityItems: any[] = [];

  let totalCurrentAssets = 0;
  let totalFixedAssets = 0;
  let totalCurrentLiabilities = 0;
  let totalLongTermLiabilities = 0;
  let totalEquity = 0;

  // حساب الأصول المتداولة (تبدأ بـ 11)
  for (const account of assetAccounts) {
    if (account.code.startsWith('11')) {
      const balance = await calculateAccountBalance(
        companyId,
        account.id,
        undefined,
        criteria.dateTo,
        criteria.branchId
      );

      const amount = balance.debit - balance.credit;
      if (amount !== 0) {
        currentAssets.push({
          accountId: account.id,
          accountCode: account.code,
          accountNameAr: account.nameAr,
          accountNameEn: account.nameEn,
          amount: Math.abs(amount),
        });
        totalCurrentAssets += Math.abs(amount);
      }
    }
  }

  // حساب الأصول الثابتة (تبدأ بـ 12)
  for (const account of assetAccounts) {
    if (account.code.startsWith('12')) {
      const balance = await calculateAccountBalance(
        companyId,
        account.id,
        undefined,
        criteria.dateTo,
        criteria.branchId
      );

      const amount = balance.debit - balance.credit;
      if (amount !== 0) {
        fixedAssets.push({
          accountId: account.id,
          accountCode: account.code,
          accountNameAr: account.nameAr,
          accountNameEn: account.nameEn,
          amount: Math.abs(amount),
        });
        totalFixedAssets += Math.abs(amount);
      }
    }
  }

  // حساب الخصوم المتداولة (تبدأ بـ 21)
  for (const account of liabilityAccounts) {
    if (account.code.startsWith('21')) {
      const balance = await calculateAccountBalance(
        companyId,
        account.id,
        undefined,
        criteria.dateTo,
        criteria.branchId
      );

      const amount = balance.credit - balance.debit;
      if (amount !== 0) {
        currentLiabilities.push({
          accountId: account.id,
          accountCode: account.code,
          accountNameAr: account.nameAr,
          accountNameEn: account.nameEn,
          amount: Math.abs(amount),
        });
        totalCurrentLiabilities += Math.abs(amount);
      }
    }
  }

  // حساب الخصوم طويلة الأجل (تبدأ بـ 22)
  for (const account of liabilityAccounts) {
    if (account.code.startsWith('22')) {
      const balance = await calculateAccountBalance(
        companyId,
        account.id,
        undefined,
        criteria.dateTo,
        criteria.branchId
      );

      const amount = balance.credit - balance.debit;
      if (amount !== 0) {
        longTermLiabilities.push({
          accountId: account.id,
          accountCode: account.code,
          accountNameAr: account.nameAr,
          accountNameEn: account.nameEn,
          amount: Math.abs(amount),
        });
        totalLongTermLiabilities += Math.abs(amount);
      }
    }
  }

  // حساب حقوق الملكية
  for (const account of equityAccounts) {
    const balance = await calculateAccountBalance(
      companyId,
      account.id,
      undefined,
      criteria.dateTo,
      criteria.branchId
    );

    const amount = balance.credit - balance.debit;
    if (amount !== 0) {
      equityItems.push({
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.nameAr,
        accountNameEn: account.nameEn,
        amount: Math.abs(amount),
      });
      totalEquity += Math.abs(amount);
    }
  }

  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      totalCurrentAssets,
      totalFixedAssets,
      totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      totalCurrentLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
    },
    equity: {
      items: equityItems,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
  };
}

/**
 * تقرير حركة حساب
 */
async function generateAccountLedger(
  companyId: string,
  criteria: z.infer<typeof reportCriteriaSchema>
): Promise<AccountLedger> {
  if (!criteria.accountId) {
    throw new Error('معرف الحساب مطلوب لتقرير حركة الحساب');
  }

  // جلب بيانات الحساب
  const account = await prisma.account.findFirst({
    where: {
      id: criteria.accountId,
      companyId,
    },
  });

  if (!account) {
    throw new Error('الحساب غير موجود');
  }

  // حساب الرصيد الافتتاحي
  const opening = await calculateOpeningBalance(
    companyId,
    criteria.accountId,
    criteria.dateFrom,
    criteria.branchId
  );

  // حساب الرصيد الافتتاحي بناءً على نوع الحساب
  const debitTypes: AccountType[] = ['asset', 'expense'];
  let openingBalance: number;
  if (debitTypes.includes(account.accountType as AccountType)) {
    openingBalance = opening.debit - opening.credit;
  } else {
    openingBalance = opening.credit - opening.debit;
  }

  // جلب حركات الفترة
  const journalLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: criteria.accountId,
      journalEntry: {
        companyId,
        status: 'posted',
        entryDate: {
          gte: criteria.dateFrom,
          lte: criteria.dateTo,
        },
        ...(criteria.branchId && { branchId: criteria.branchId }),
      },
    },
    include: {
      journalEntry: {
        select: {
          entryNo: true,
          entryDate: true,
          description: true,
          sourceType: true,
          sourceId: true,
        },
      },
    },
    orderBy: {
      journalEntry: {
        entryDate: 'asc',
      },
    },
  });

  const items: any[] = [];
  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of journalLines) {
    const debit = toNumber(line.debit);
    const credit = toNumber(line.credit);

    // تحديث الرصيد الجاري
    if (debitTypes.includes(account.accountType as AccountType)) {
      runningBalance += debit - credit;
    } else {
      runningBalance += credit - debit;
    }

    items.push({
      entryDate: line.journalEntry.entryDate,
      entryNo: line.journalEntry.entryNo,
      description: line.description || line.journalEntry.description,
      referenceNo: line.referenceNo,
      debit,
      credit,
      balance: runningBalance,
      sourceType: line.journalEntry.sourceType,
      sourceId: line.journalEntry.sourceId,
    });

    totalDebit += debit;
    totalCredit += credit;
  }

  // حساب الرصيد الختامي
  const closingBalance = runningBalance;

  return {
    account: {
      id: account.id,
      companyId: account.companyId,
      code: account.code,
      nameAr: account.nameAr,
      nameEn: account.nameEn,
      accountType: account.accountType as AccountType,
      levelNo: account.levelNo,
      isPostable: account.isPostable,
      currencyControl: account.currencyControl,
      branchTracking: account.branchTracking,
      costCenterTracking: account.costCenterTracking,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    },
    openingBalance,
    openingDebit: opening.debit,
    openingCredit: opening.credit,
    items,
    totalDebit,
    totalCredit,
    closingBalance,
  };
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reportType, criteria } = reportRequestSchema.parse(body);

    let data: any;

    switch (reportType) {
      case 'trial-balance':
        data = await generateTrialBalance(companyId, criteria);
        break;

      case 'income-statement':
        data = await generateIncomeStatement(companyId, criteria);
        break;

      case 'balance-sheet':
        data = await generateBalanceSheet(companyId, criteria);
        break;

      case 'account-ledger':
        data = await generateAccountLedger(companyId, criteria);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'نوع التقرير غير معروف' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      criteria: {
        dateFrom: criteria.dateFrom,
        dateTo: criteria.dateTo,
        branchId: criteria.branchId,
      },
    });
  } catch (error) {
    console.error('خطأ في إنشاء التقرير:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
