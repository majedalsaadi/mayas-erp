/**
 * Mayas ERP - Report Engine
 * محرك التقارير
 */

import { db } from '@/lib/db';

export interface ReportParams {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  warehouseId?: string;
  customerId?: string;
  supplierId?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  data: any;
  summary?: any;
}

/**
 * تقرير المبيعات
 */
export async function getSalesReport(params: ReportParams): Promise<ReportData> {
  const { companyId, startDate, endDate, branchId, customerId } = params;

  const where: any = {
    companyId,
    status: 'POSTED',
  };

  if (startDate && endDate) {
    where.invoiceDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  if (branchId) {
    where.branchId = branchId;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  const invoices = await db.salesInvoice.findMany({
    where,
    include: {
      customer: true,
      branch: true,
      items: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      invoiceDate: 'desc',
    },
  });

  const summary = {
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount?.toNumber() || 0), 0),
    totalTax: invoices.reduce((sum, inv) => sum + (inv.taxAmount?.toNumber() || 0), 0),
    totalNet: invoices.reduce((sum, inv) => sum + (inv.netAmount?.toNumber() || 0), 0),
  };

  return {
    title: 'تقرير المبيعات',
    subtitle: startDate && endDate 
      ? `من ${startDate.toLocaleDateString('ar-SA')} إلى ${endDate.toLocaleDateString('ar-SA')}`
      : undefined,
    generatedAt: new Date(),
    data: invoices,
    summary,
  };
}

/**
 * تقرير المخزون
 */
export async function getInventoryReport(params: ReportParams): Promise<ReportData> {
  const { companyId, warehouseId } = params;

  const where: any = { companyId };

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  const stockBalances = await db.stockBalance.findMany({
    where,
    include: {
      item: {
        include: {
          category: true,
          brand: true,
          unit: true,
        },
      },
      warehouse: true,
    },
    orderBy: {
      item: {
        nameAr: 'asc',
      },
    },
  });

  const summary = {
    totalItems: stockBalances.length,
    totalQuantity: stockBalances.reduce((sum, sb) => sum + (sb.quantity?.toNumber() || 0), 0),
    totalValue: stockBalances.reduce((sum, sb) => sum + (sb.quantity?.toNumber() || 0) * (sb.averageCost?.toNumber() || 0), 0),
    lowStock: stockBalances.filter(sb => (sb.quantity?.toNumber() || 0) <= (sb.minimumStock?.toNumber() || 10)).length,
  };

  return {
    title: 'تقرير المخزون',
    generatedAt: new Date(),
    data: stockBalances,
    summary,
  };
}

/**
 * تقرير ميزان المراجعة
 */
export async function getTrialBalance(params: ReportParams): Promise<ReportData> {
  const { companyId, startDate, endDate } = params;

  const accounts = await db.account.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      journalLines: {
        where: startDate && endDate ? {
          journalEntry: {
            entryDate: {
              gte: startDate,
              lte: endDate,
            },
            isPosted: true,
          },
        } : {
          journalEntry: {
            isPosted: true,
          },
        },
      },
    },
    orderBy: {
      code: 'asc',
    },
  });

  const accountsWithBalance = accounts.map(account => {
    const debit = account.journalLines.reduce((sum, line) => sum + (line.debit?.toNumber() || 0), 0);
    const credit = account.journalLines.reduce((sum, line) => sum + (line.credit?.toNumber() || 0), 0);
    const balance = debit - credit;

    return {
      ...account,
      debit,
      credit,
      balance,
    };
  });

  const summary = {
    totalDebit: accountsWithBalance.reduce((sum, acc) => sum + acc.debit, 0),
    totalCredit: accountsWithBalance.reduce((sum, acc) => sum + acc.credit, 0),
    isBalanced: Math.abs(
      accountsWithBalance.reduce((sum, acc) => sum + acc.debit, 0) -
      accountsWithBalance.reduce((sum, acc) => sum + acc.credit, 0)
    ) < 0.01,
  };

  return {
    title: 'ميزان المراجعة',
    subtitle: startDate && endDate 
      ? `من ${startDate.toLocaleDateString('ar-SA')} إلى ${endDate.toLocaleDateString('ar-SA')}`
      : undefined,
    generatedAt: new Date(),
    data: accountsWithBalance,
    summary,
  };
}
