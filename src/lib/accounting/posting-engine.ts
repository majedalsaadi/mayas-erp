/**
 * Mayas ERP - Automatic Posting Engine
 * محرك القيود الآلية
 * 
 * يوفر هذا المحرك وظائف الترحيل التلقائي للمستندات المختلفة:
 * - ترحيل فواتير المبيعات
 * - ترحيل فواتير المشتريات
 * - ترحيل المدفوعات
 * - ترحيل تسويات المخزون
 * - ترحيل المرتجعات
 */

import prisma from '../db';
import { createJournalEntry, postJournalEntry } from './journal';
import type {
  PostingContext,
  PostingResult,
  PostingLineResult,
  JournalSourceType,
} from '@/types/accounting';

// ============================================
// الأخطاء المخصصة
// ============================================

/** خطأ في الترحيل */
export class PostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostingError';
  }
}

/** خطأ الحساب غير موجود */
export class AccountMappingNotFoundError extends Error {
  constructor(key: string) {
    super(`لم يتم العثور على تعيين الحساب: ${key}`);
    this.name = 'AccountMappingNotFoundError';
  }
}

/** خطأ المستند غير موجود */
export class SourceDocumentNotFoundError extends Error {
  constructor(sourceType: string, sourceId: string) {
    super(`المستند غير موجود: ${sourceType}/${sourceId}`);
    this.name = 'SourceDocumentNotFoundError';
  }
}

/** خطأ المستند مرحل مسبقاً */
export class AlreadyPostedError extends Error {
  constructor(sourceType: string, sourceId: string) {
    super(`المستند مرحل مسبقاً: ${sourceType}/${sourceId}`);
    this.name = 'AlreadyPostedError';
  }
}

// ============================================
// تعيينات الحسابات الافتراضية
// ============================================

/** مفاتيح الحسابات */
export type AccountKey =
  | 'cash'                    // الصندوق
  | 'bank'                    // البنك
  | 'accounts_receivable'     // العملاء
  | 'accounts_payable'        // الموردون
  | 'sales'                   // المبيعات
  | 'sales_returns'           // مرتجع المبيعات
  | 'sales_discount'          // خصم المبيعات
  | 'cost_of_goods_sold'      // تكلفة البضاعة المباعة
  | 'inventory'               // المخزون
  | 'purchase'                // المشتريات
  | 'purchase_returns'        // مرتجع المشتريات
  | 'purchase_discount'       // خصم المشتريات
  | 'vat_output'              // ضريبة المخرجات
  | 'vat_input'               // ضريبة المدخلات
  | 'vat_payable'             // ضريبة مستحقة
  | 'other_income'            // إيرادات أخرى
  | 'other_expenses'          // مصروفات أخرى
  | 'rounding';               // فروق التقريب

/** تعيينات الحسابات الافتراضية حسب نوع المصدر */
const defaultAccountMappings: Record<string, Partial<Record<AccountKey, string>>> = {};

/**
 * الحصول على معرف الحساب من التعيينات
 */
async function getAccountId(
  companyId: string,
  key: AccountKey,
  overrides?: Record<string, string>
): Promise<string> {
  // البحث في التعيينات المخصصة أولاً
  if (overrides && overrides[key]) {
    const account = await prisma.account.findFirst({
      where: { id: overrides[key], companyId, isActive: true },
    });
    if (account) return account.id;
  }

  // البحث في التعيينات الافتراضية
  const companyMappings = defaultAccountMappings[companyId];
  if (companyMappings && companyMappings[key]) {
    return companyMappings[key]!;
  }

  // البحث بالاسم العربي
  const accountNames: Record<AccountKey, string[]> = {
    cash: ['الصندوق', 'النقدية'],
    bank: ['البنك', 'البنوك'],
    accounts_receivable: ['العملاء', 'الذمم المدينة', 'العملاء - أوراق القبض'],
    accounts_payable: ['الموردون', 'الذمم الدائنة', 'الموردون - أوراق الدفع'],
    sales: ['المبيعات', 'إيرادات المبيعات', 'مبيعات البضاعة'],
    sales_returns: ['مرتجع المبيعات', 'المبيعات المرتجعة'],
    sales_discount: ['خصم المبيعات', 'المسموحات'],
    cost_of_goods_sold: ['تكلفة البضاعة المباعة', 'تكلفة المبيعات', 'م.ب.م'],
    inventory: ['المخزون', 'مخزون البضاعة', 'البضاعة'],
    purchase: ['المشتريات', 'المشتريات - بضاعة'],
    purchase_returns: ['مرتجع المشتريات', 'المشتريات المرتجعة'],
    purchase_discount: ['خصم المشتريات', 'خصم على المشتريات'],
    vat_output: ['ضريبة المخرجات', 'ضريبة القيمة المضافة - مخرجات', 'ضريبة القيمة المضافة'],
    vat_input: ['ضريبة المدخلات', 'ضريبة القيمة المضافة - مدخلات'],
    vat_payable: ['ضريبة مستحقة', 'ضريبة القيمة المضافة المستحقة'],
    other_income: ['إيرادات أخرى', 'إيرادات متنوعة'],
    other_expenses: ['مصروفات أخرى', 'مصروفات متنوعة'],
    rounding: ['فروق التقريب', 'أرباح فروق العملة'],
  };

  const names = accountNames[key];
  if (names) {
    for (const name of names) {
      const account = await prisma.account.findFirst({
        where: {
          companyId,
          nameAr: { equals: name, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (account) {
        // حفظ في التعيينات الافتراضية
        if (!defaultAccountMappings[companyId]) {
          defaultAccountMappings[companyId] = {};
        }
        defaultAccountMappings[companyId][key] = account.id;
        return account.id;
      }
    }
  }

  throw new AccountMappingNotFoundError(key);
}

// ============================================
// دوال الترحيل
// ============================================

/**
 * ترحيل فاتورة مبيعات
 * 
 * القيود الناتجة:
 * 1. من حـ/ العميل (أو الصندوق/البنك)        إلى حـ/ المبيعات
 * 2. من حـ/ تكلفة البضاعة المباعة           إلى حـ/ المخزون
 */
export async function postSalesInvoice(
  context: PostingContext,
  invoice: {
    id: string;
    customerId: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    costTotal: number;
    invoiceType: 'cash' | 'credit';
    paymentMethod?: string;
    cashboxId?: string;
    bankAccountId?: string;
    receivableAccountId?: string;
    salesAccountId?: string;
    inventoryAccountId?: string;
    cogsAccountId?: string;
  }
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = [];

    // الحصول على معرفات الحسابات
    const accountsReceivableId = await getAccountId(
      context.companyId,
      'accounts_receivable',
      { accounts_receivable: invoice.receivableAccountId }
    );
    const salesId = await getAccountId(
      context.companyId,
      'sales',
      { sales: invoice.salesAccountId }
    );
    const salesDiscountId = await getAccountId(context.companyId, 'sales_discount');
    const vatOutputId = await getAccountId(context.companyId, 'vat_output');
    const cashId = await getAccountId(context.companyId, 'cash');
    const bankId = await getAccountId(context.companyId, 'bank');

    // حساب صافي المبيعات
    const netSales = invoice.subtotal - invoice.discountAmount;

    // 1. قيد الإيراد
    if (invoice.invoiceType === 'credit') {
      // بيع آجل
      lines.push({
        accountId: accountsReceivableId,
        accountCode: '',
        accountNameAr: 'العملاء',
        debit: invoice.totalAmount,
        credit: 0,
        description: `فاتورة مبيعات آجلة - العميل`,
      });
    } else {
      // بيع نقدي
      const cashAccountId = invoice.paymentMethod === 'card' || 
                           invoice.paymentMethod === 'transfer' ? bankId : cashId;
      lines.push({
        accountId: cashAccountId,
        accountCode: '',
        accountNameAr: invoice.paymentMethod === 'card' ? 'البنك' : 'الصندوق',
        debit: invoice.paidAmount,
        credit: 0,
        description: `فاتورة مبيعات نقدية - ${invoice.paymentMethod || 'نقدي'}`,
      });
      
      // إذا كان هناك رصيد مستحق
      if (invoice.totalAmount > invoice.paidAmount) {
        lines.push({
          accountId: accountsReceivableId,
          accountCode: '',
          accountNameAr: 'العملاء',
          debit: invoice.totalAmount - invoice.paidAmount,
          credit: 0,
          description: 'رصيد مستحق',
        });
      }
    }

    // المبيعات (دائن)
    lines.push({
      accountId: salesId,
      accountCode: '',
      accountNameAr: 'المبيعات',
      debit: 0,
      credit: netSales,
      description: 'إيراد المبيعات',
    });

    // الخصم (دائن) إذا وجد
    if (invoice.discountAmount > 0) {
      lines.push({
        accountId: salesDiscountId,
        accountCode: '',
        accountNameAr: 'خصم المبيعات',
        debit: 0,
        credit: invoice.discountAmount,
        description: 'خصم على المبيعات',
      });
    }

    // الضريبة (دائن) إذا وجدت
    if (invoice.taxAmount > 0) {
      lines.push({
        accountId: vatOutputId,
        accountCode: '',
        accountNameAr: 'ضريبة القيمة المضافة',
        debit: 0,
        credit: invoice.taxAmount,
        description: 'ضريبة القيمة المضافة المستحقة',
      });
    }

    // 2. قيد التكلفة (إذا كان هناك تكلفة)
    if (invoice.costTotal > 0) {
      const cogsId = await getAccountId(
        context.companyId,
        'cost_of_goods_sold',
        { cost_of_goods_sold: invoice.cogsAccountId }
      );
      const inventoryId = await getAccountId(
        context.companyId,
        'inventory',
        { inventory: invoice.inventoryAccountId }
      );

      lines.push({
        accountId: cogsId,
        accountCode: '',
        accountNameAr: 'تكلفة البضاعة المباعة',
        debit: invoice.costTotal,
        credit: 0,
        description: 'تكلفة البضاعة المباعة',
      });

      lines.push({
        accountId: inventoryId,
        accountCode: '',
        accountNameAr: 'المخزون',
        debit: 0,
        credit: invoice.costTotal,
        description: 'إخراج من المخزون',
      });
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || `فاتورة مبيعات`,
        sourceType: 'sales_invoice',
        sourceId: invoice.id,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          customerId: invoice.customerId,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    // حساب المجاميع
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}

/**
 * ترحيل فاتورة مشتريات
 * 
 * القيود الناتجة:
 * 1. من حـ/ المخزون (أو المشتريات)         إلى حـ/ المورد (أو الصندوق/البنك)
 * 2. من حـ/ ضريبة المدخلات                إلى حـ/ المورد (أو الصندوق/البنك)
 */
export async function postPurchaseInvoice(
  context: PostingContext,
  invoice: {
    id: string;
    supplierId: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    costTotal: number;
    invoiceType: 'cash' | 'credit';
    paymentMethod?: string;
    cashboxId?: string;
    bankAccountId?: string;
    payableAccountId?: string;
    purchaseAccountId?: string;
    inventoryAccountId?: string;
  }
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = [];

    // الحصول على معرفات الحسابات
    const accountsPayableId = await getAccountId(
      context.companyId,
      'accounts_payable',
      { accounts_payable: invoice.payableAccountId }
    );
    const inventoryId = await getAccountId(
      context.companyId,
      'inventory',
      { inventory: invoice.inventoryAccountId }
    );
    const purchaseId = await getAccountId(
      context.companyId,
      'purchase',
      { purchase: invoice.purchaseAccountId }
    );
    const purchaseDiscountId = await getAccountId(context.companyId, 'purchase_discount');
    const vatInputId = await getAccountId(context.companyId, 'vat_input');
    const cashId = await getAccountId(context.companyId, 'cash');
    const bankId = await getAccountId(context.companyId, 'bank');

    // حساب صافي المشتريات
    const netPurchase = invoice.subtotal - invoice.discountAmount;

    // المخزون/المشتريات (مدين)
    lines.push({
      accountId: invoice.inventoryAccountId || inventoryId,
      accountCode: '',
      accountNameAr: 'المخزون',
      debit: netPurchase,
      credit: 0,
      description: 'مشتريات بضاعة',
    });

    // الضريبة (مدين) إذا وجدت
    if (invoice.taxAmount > 0) {
      lines.push({
        accountId: vatInputId,
        accountCode: '',
        accountNameAr: 'ضريبة المدخلات',
        debit: invoice.taxAmount,
        credit: 0,
        description: 'ضريبة القيمة المضافة على المشتريات',
      });
    }

    // الخصم (مدين) إذا وجد
    if (invoice.discountAmount > 0) {
      lines.push({
        accountId: purchaseDiscountId,
        accountCode: '',
        accountNameAr: 'خصم المشتريات',
        debit: invoice.discountAmount,
        credit: 0,
        description: 'خصم على المشتريات',
      });
    }

    // المورد/الصندوق (دائن)
    if (invoice.invoiceType === 'credit') {
      // شراء آجل
      lines.push({
        accountId: accountsPayableId,
        accountCode: '',
        accountNameAr: 'الموردون',
        debit: 0,
        credit: invoice.totalAmount,
        description: 'مشتريات آجلة - المورد',
      });
    } else {
      // شراء نقدي
      const cashAccountId = invoice.paymentMethod === 'card' || 
                           invoice.paymentMethod === 'transfer' ? bankId : cashId;
      lines.push({
        accountId: cashAccountId,
        accountCode: '',
        accountNameAr: invoice.paymentMethod === 'card' ? 'البنك' : 'الصندوق',
        debit: 0,
        credit: invoice.paidAmount,
        description: `مشتريات نقدية - ${invoice.paymentMethod || 'نقدي'}`,
      });
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || `فاتورة مشتريات`,
        sourceType: 'purchase_invoice',
        sourceId: invoice.id,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          supplierId: invoice.supplierId,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    // حساب المجاميع
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}

/**
 * ترحيل سداد دائن (للمورد)
 * 
 * القيد الناتج:
 * من حـ/ المورد    إلى حـ/ الصندوق/البنك
 */
export async function postPayment(
  context: PostingContext,
  payment: {
    id: string;
    supplierId?: string;
    customerId?: string;
    amount: number;
    paymentMethod: string;
    cashboxId?: string;
    bankAccountId?: string;
    referenceNo?: string;
    payableAccountId?: string;
    receivableAccountId?: string;
  }
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = [];

    // تحديد نوع السداد
    const isPaymentToSupplier = !!payment.supplierId;
    const isReceiptFromCustomer = !!payment.customerId;

    if (isPaymentToSupplier) {
      // سداد للمورد
      const accountsPayableId = await getAccountId(
        context.companyId,
        'accounts_payable',
        { accounts_payable: payment.payableAccountId }
      );
      const cashId = await getAccountId(context.companyId, 'cash');
      const bankId = await getAccountId(context.companyId, 'bank');

      // المورد (مدين)
      lines.push({
        accountId: accountsPayableId,
        accountCode: '',
        accountNameAr: 'الموردون',
        debit: payment.amount,
        credit: 0,
        description: 'سداد للمورد',
      });

      // الصندوق/البنك (دائن)
      const cashAccountId = payment.paymentMethod === 'card' || 
                           payment.paymentMethod === 'transfer' || 
                           payment.paymentMethod === 'cheque' ? bankId : cashId;
      lines.push({
        accountId: cashAccountId,
        accountCode: '',
        accountNameAr: payment.paymentMethod === 'transfer' ? 'البنك' : 'الصندوق',
        debit: 0,
        credit: payment.amount,
        description: `سداد ${payment.paymentMethod}`,
      });
    } else if (isReceiptFromCustomer) {
      // قبض من العميل
      const accountsReceivableId = await getAccountId(
        context.companyId,
        'accounts_receivable',
        { accounts_receivable: payment.receivableAccountId }
      );
      const cashId = await getAccountId(context.companyId, 'cash');
      const bankId = await getAccountId(context.companyId, 'bank');

      // الصندوق/البنك (مدين)
      const cashAccountId = payment.paymentMethod === 'card' || 
                           payment.paymentMethod === 'transfer' ? bankId : cashId;
      lines.push({
        accountId: cashAccountId,
        accountCode: '',
        accountNameAr: payment.paymentMethod === 'transfer' ? 'البنك' : 'الصندوق',
        debit: payment.amount,
        credit: 0,
        description: `قبض ${payment.paymentMethod}`,
      });

      // العميل (دائن)
      lines.push({
        accountId: accountsReceivableId,
        accountCode: '',
        accountNameAr: 'العملاء',
        debit: 0,
        credit: payment.amount,
        description: 'قبض من العميل',
      });
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || (isPaymentToSupplier ? 'سداد للمورد' : 'قبض من العميل'),
        sourceType: isPaymentToSupplier ? 'payment' : 'receipt',
        sourceId: payment.id,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          supplierId: payment.supplierId,
          customerId: payment.customerId,
          referenceNo: payment.referenceNo,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    // حساب المجاميع
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}

/**
 * ترحيل مرتجع مبيعات
 * 
 * القيود الناتجة:
 * 1. من حـ/ المبيعات المرتجعة            إلى حـ/ العميل (أو الصندوق/البنك)
 * 2. من حـ/ المخزون                       إلى حـ/ تكلفة البضاعة المباعة
 */
export async function postSalesReturn(
  context: PostingContext,
  returnData: {
    id: string;
    customerId: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    costTotal: number;
    refundMethod?: string;
    receivableAccountId?: string;
    salesReturnsAccountId?: string;
    inventoryAccountId?: string;
    cogsAccountId?: string;
  }
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = [];

    // الحصول على معرفات الحسابات
    const accountsReceivableId = await getAccountId(
      context.companyId,
      'accounts_receivable',
      { accounts_receivable: returnData.receivableAccountId }
    );
    const salesReturnsId = await getAccountId(
      context.companyId,
      'sales_returns',
      { sales_returns: returnData.salesReturnsAccountId }
    );
    const vatOutputId = await getAccountId(context.companyId, 'vat_output');
    const cashId = await getAccountId(context.companyId, 'cash');
    const bankId = await getAccountId(context.companyId, 'bank');
    const cogsId = await getAccountId(
      context.companyId,
      'cost_of_goods_sold',
      { cost_of_goods_sold: returnData.cogsAccountId }
    );
    const inventoryId = await getAccountId(
      context.companyId,
      'inventory',
      { inventory: returnData.inventoryAccountId }
    );

    // حساب صافي المرتجع
    const netReturn = returnData.subtotal - returnData.discountAmount;

    // 1. قيد المرتجع
    // المبيعات المرتجعة (مدين)
    lines.push({
      accountId: salesReturnsId,
      accountCode: '',
      accountNameAr: 'مرتجع المبيعات',
      debit: netReturn,
      credit: 0,
      description: 'مرتجع مبيعات',
    });

    // الضريبة (مدين) إذا وجدت
    if (returnData.taxAmount > 0) {
      lines.push({
        accountId: vatOutputId,
        accountCode: '',
        accountNameAr: 'ضريبة القيمة المضافة',
        debit: returnData.taxAmount,
        credit: 0,
        description: 'خفض ضريبة المخرجات',
      });
    }

    // العميل/الصندوق (دائن)
    if (returnData.refundMethod === 'cash') {
      lines.push({
        accountId: cashId,
        accountCode: '',
        accountNameAr: 'الصندوق',
        debit: 0,
        credit: returnData.totalAmount,
        description: 'استرداد نقدي',
      });
    } else if (returnData.refundMethod === 'bank') {
      lines.push({
        accountId: bankId,
        accountCode: '',
        accountNameAr: 'البنك',
        debit: 0,
        credit: returnData.totalAmount,
        description: 'استرداد بنكي',
      });
    } else {
      lines.push({
        accountId: accountsReceivableId,
        accountCode: '',
        accountNameAr: 'العملاء',
        debit: 0,
        credit: returnData.totalAmount,
        description: 'تخفيض ذمة العميل',
      });
    }

    // 2. قيد إعادة المخزون (إذا كان هناك تكلفة)
    if (returnData.costTotal > 0) {
      lines.push({
        accountId: inventoryId,
        accountCode: '',
        accountNameAr: 'المخزون',
        debit: returnData.costTotal,
        credit: 0,
        description: 'إعادة للمخزون',
      });

      lines.push({
        accountId: cogsId,
        accountCode: '',
        accountNameAr: 'تكلفة البضاعة المباعة',
        debit: 0,
        credit: returnData.costTotal,
        description: 'خفض تكلفة المبيعات',
      });
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || `مرتجع مبيعات`,
        sourceType: 'sales_return',
        sourceId: returnData.id,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          customerId: returnData.customerId,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    // حساب المجاميع
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}

/**
 * ترحيل تسوية مخزون
 */
export async function postInventoryAdjustment(
  context: PostingContext,
  adjustment: {
    id: string;
    itemId: string;
    qtyAdjustment: number;
    costAdjustment: number;
    inventoryAccountId?: string;
    adjustmentAccountId?: string;
    description?: string;
  }
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = [];

    // الحصول على معرفات الحسابات
    const inventoryId = await getAccountId(
      context.companyId,
      'inventory',
      { inventory: adjustment.inventoryAccountId }
    );
    const otherExpensesId = await getAccountId(
      context.companyId,
      'other_expenses',
      { other_expenses: adjustment.adjustmentAccountId }
    );
    const otherIncomeId = await getAccountId(
      context.companyId,
      'other_income',
      { other_income: adjustment.adjustmentAccountId }
    );

    const adjustmentAmount = Math.abs(adjustment.costAdjustment);
    const isPositive = adjustment.costAdjustment > 0;

    if (isPositive) {
      // زيادة في المخزون
      lines.push({
        accountId: inventoryId,
        accountCode: '',
        accountNameAr: 'المخزون',
        debit: adjustmentAmount,
        credit: 0,
        description: adjustment.description || 'زيادة مخزون',
      });
      lines.push({
        accountId: otherIncomeId,
        accountCode: '',
        accountNameAr: 'إيرادات أخرى',
        debit: 0,
        credit: adjustmentAmount,
        description: 'فائض مخزون',
      });
    } else {
      // نقص في المخزون
      lines.push({
        accountId: otherExpensesId,
        accountCode: '',
        accountNameAr: 'مصروفات أخرى',
        debit: adjustmentAmount,
        credit: 0,
        description: adjustment.description || 'نقص مخزون',
      });
      lines.push({
        accountId: inventoryId,
        accountCode: '',
        accountNameAr: 'المخزون',
        debit: 0,
        credit: adjustmentAmount,
        description: 'عجز مخزون',
      });
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || `تسوية مخزون`,
        sourceType: 'inventory_adjust',
        sourceId: adjustment.id,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    // حساب المجاميع
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}

/**
 * ترحيل رصيد افتتاحي
 */
export async function postOpeningBalance(
  context: PostingContext,
  balances: Array<{
    accountId: string;
    accountCode: string;
    accountNameAr: string;
    debit: number;
    credit: number;
  }>
): Promise<PostingResult> {
  try {
    const lines: PostingLineResult[] = balances.map((balance) => ({
      accountId: balance.accountId,
      accountCode: balance.accountCode,
      accountNameAr: balance.accountNameAr,
      debit: balance.debit,
      credit: balance.credit,
      description: 'رصيد افتتاحي',
    }));

    // التحقق من التوازن
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return {
        success: false,
        totalDebit,
        totalCredit,
        lines,
        error: `الأرصدة الافتتاحية غير متوازنة: المدين ${totalDebit}، الدائن ${totalCredit}`,
      };
    }

    // إنشاء القيد
    const journalEntry = await createJournalEntry(
      context.companyId,
      {
        branchId: context.branchId,
        entryDate: context.transactionDate,
        description: context.description || 'قيود الأرصدة الافتتاحية',
        sourceType: 'opening_balance',
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
        })),
      },
      context.userId
    );

    // ترحيل القيد
    const postedEntry = await postJournalEntry(context.companyId, journalEntry.id, context.userId);

    return {
      success: true,
      journalEntryId: postedEntry.id,
      entryNo: postedEntry.entryNo,
      totalDebit,
      totalCredit,
      lines,
    };
  } catch (error) {
    return {
      success: false,
      totalDebit: 0,
      totalCredit: 0,
      lines: [],
      error: error instanceof Error ? error.message : 'خطأ في الترحيل',
    };
  }
}
