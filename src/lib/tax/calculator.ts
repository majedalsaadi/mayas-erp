/**
 * Mayas ERP - Tax Calculator
 * حاسبة الضرائب
 * 
 * توفر هذه الوحدة وظائف حساب الضريبة بما يتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك
 */

import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type {
  TaxLineCalculation,
  TaxCalculationResult,
  InvoiceTaxSummary,
  ZATCACategory,
} from '@/types/tax';
import { Decimal } from '@prisma/client/runtime/library';

const logger = createLogger('TaxCalculator');

// ============================================
// أنواع داخلية
// ============================================

interface TaxCalculationInput {
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCodeId: string;
  taxInclusive?: boolean;
}

interface TaxCodeInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rate: number;
  zatcaCategory: ZATCACategory | null;
}

interface InvoiceLineInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCodeId: string;
}

// ============================================
// Cache للأكواد الضريبية
// ============================================

const taxCodeCache = new Map<string, TaxCodeInfo>();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
const cacheTimestamps = new Map<string, number>();

/**
 * جلب معلومات كود الضريبة
 */
export async function getTaxCodeInfo(taxCodeId: string): Promise<TaxCodeInfo | null> {
  // التحقق من الكاش
  const cached = taxCodeCache.get(taxCodeId);
  const cacheTime = cacheTimestamps.get(taxCodeId);
  
  if (cached && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cached;
  }

  try {
    const taxCode = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        rate: true,
        zatcaCategory: true,
      },
    });

    if (!taxCode) {
      return null;
    }

    const info: TaxCodeInfo = {
      id: taxCode.id,
      code: taxCode.code,
      nameAr: taxCode.nameAr,
      nameEn: taxCode.nameEn,
      rate: Number(taxCode.rate),
      zatcaCategory: taxCode.zatcaCategory as ZATCACategory | null,
    };

    // تحديث الكاش
    taxCodeCache.set(taxCodeId, info);
    cacheTimestamps.set(taxCodeId, Date.now());

    return info;
  } catch (error) {
    logger.error('خطأ في جلب كود الضريبة', error as Error, { taxCodeId });
    throw error;
  }
}

/**
 * جلب كود الضريبة الافتراضي للمبيعات
 */
export async function getDefaultSalesTaxCode(companyId: string): Promise<TaxCodeInfo | null> {
  try {
    const taxCode = await prisma.taxCode.findFirst({
      where: {
        companyId,
        isDefaultSales: true,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        rate: true,
        zatcaCategory: true,
      },
    });

    if (!taxCode) {
      return null;
    }

    return {
      id: taxCode.id,
      code: taxCode.code,
      nameAr: taxCode.nameAr,
      nameEn: taxCode.nameEn,
      rate: Number(taxCode.rate),
      zatcaCategory: taxCode.zatcaCategory as ZATCACategory | null,
    };
  } catch (error) {
    logger.error('خطأ في جلب كود الضريبة الافتراضي', error as Error, { companyId });
    throw error;
  }
}

// ============================================
// حساب الضريبة
// ============================================

/**
 * حساب الضريبة لبند واحد
 */
export function calculateTaxForLine(input: TaxCalculationInput): TaxLineCalculation {
  const {
    unitPrice,
    quantity,
    discountPercent = 0,
    discountAmount = 0,
    taxCodeId,
    taxInclusive = false,
  } = input;

  // حساب المبلغ قبل الضريبة
  const grossAmount = unitPrice * quantity;
  
  // حساب الخصم
  const percentDiscount = grossAmount * (discountPercent / 100);
  const totalDiscount = percentDiscount + discountAmount;
  
  // المبلغ الخاضع للضريبة
  const taxableAmount = Math.max(0, grossAmount - totalDiscount);

  // جلب معلومات كود الضريبة (يجب أن يتم بشكل متزامن في الاستخدام الفعلي)
  // هذا يعيد نتيجة افتراضية - يجب استخدام calculateTaxForLineAsync للنتائج الفعلية
  const taxRate = 15; // معدل افتراضي
  const zatcaCategory: ZATCACategory = 'STANDARD';

  let taxAmount: number;
  let finalTaxableAmount: number;

  if (taxInclusive) {
    // السعر شامل الضريبة
    taxAmount = taxableAmount * (taxRate / (100 + taxRate));
    finalTaxableAmount = taxableAmount - taxAmount;
  } else {
    // السعر غير شامل الضريبة
    taxAmount = taxableAmount * (taxRate / 100);
    finalTaxableAmount = taxableAmount;
  }

  return {
    taxCodeId,
    taxCode: 'VAT15',
    taxRate,
    taxableAmount: Math.round(finalTaxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    zatcaCategory,
  };
}

/**
 * حساب الضريبة لبند واحد (غير متزامن مع جلب البيانات)
 */
export async function calculateTaxForLineAsync(
  input: TaxCalculationInput
): Promise<TaxLineCalculation> {
  const {
    unitPrice,
    quantity,
    discountPercent = 0,
    discountAmount = 0,
    taxCodeId,
    taxInclusive = false,
  } = input;

  // جلب معلومات كود الضريبة
  const taxCodeInfo = await getTaxCodeInfo(taxCodeId);
  
  if (!taxCodeInfo) {
    throw new Error(`كود الضريبة غير موجود: ${taxCodeId}`);
  }

  // حساب المبلغ قبل الضريبة
  const grossAmount = unitPrice * quantity;
  
  // حساب الخصم
  const percentDiscount = grossAmount * (discountPercent / 100);
  const totalDiscount = percentDiscount + discountAmount;
  
  // المبلغ الخاضع للضريبة
  const taxableAmount = Math.max(0, grossAmount - totalDiscount);

  const taxRate = taxCodeInfo.rate;
  const zatcaCategory = taxCodeInfo.zatcaCategory || 'STANDARD';

  let taxAmount: number;
  let finalTaxableAmount: number;

  if (taxInclusive) {
    // السعر شامل الضريبة
    taxAmount = taxableAmount * (taxRate / (100 + taxRate));
    finalTaxableAmount = taxableAmount - taxAmount;
  } else {
    // السعر غير شامل الضريبة
    taxAmount = taxableAmount * (taxRate / 100);
    finalTaxableAmount = taxableAmount;
  }

  // تقريب إلى منزلتين عشريتين
  return {
    taxCodeId,
    taxCode: taxCodeInfo.code,
    taxRate,
    taxableAmount: Math.round(finalTaxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    zatcaCategory,
  };
}

/**
 * حساب الضريبة لعدد من البنود
 */
export async function calculateTaxForLines(
  lines: InvoiceLineInput[]
): Promise<TaxCalculationResult> {
  const taxLines: TaxLineCalculation[] = [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTaxAmount = 0;

  for (const line of lines) {
    const { quantity, unitPrice, discountPercent = 0, discountAmount = 0, taxCodeId } = line;

    // حساب المبلغ الإجمالي للبند
    const lineGross = quantity * unitPrice;
    subtotal += lineGross;

    // حساب الخصم
    const lineDiscount = lineGross * (discountPercent / 100) + discountAmount;
    totalDiscount += lineDiscount;

    // حساب الضريبة
    const taxCalculation = await calculateTaxForLineAsync({
      unitPrice,
      quantity,
      discountPercent,
      discountAmount,
      taxCodeId,
      taxInclusive: false,
    });

    taxLines.push(taxCalculation);
    totalTaxAmount += taxCalculation.taxAmount;
  }

  const taxableAmount = subtotal - totalDiscount;
  const totalWithTax = taxableAmount + totalTaxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxLines,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalWithTax: Math.round(totalWithTax * 100) / 100,
    taxExclusiveAmount: Math.round(taxableAmount * 100) / 100,
    taxInclusiveAmount: Math.round(totalWithTax * 100) / 100,
  };
}

/**
 * حساب ملخص الضريبة للفاتورة
 */
export async function calculateInvoiceTaxSummary(
  lines: InvoiceLineInput[]
): Promise<InvoiceTaxSummary[]> {
  const summaryMap = new Map<string, InvoiceTaxSummary>();

  for (const line of lines) {
    const taxCalculation = await calculateTaxForLineAsync({
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      discountPercent: line.discountPercent,
      discountAmount: line.discountAmount,
      taxCodeId: line.taxCodeId,
      taxInclusive: false,
    });

    const existing = summaryMap.get(line.taxCodeId);
    
    if (existing) {
      existing.taxableAmount += taxCalculation.taxableAmount;
      existing.taxAmount += taxCalculation.taxAmount;
    } else {
      const taxCodeInfo = await getTaxCodeInfo(line.taxCodeId);
      
      summaryMap.set(line.taxCodeId, {
        taxCodeId: line.taxCodeId,
        taxCode: taxCalculation.taxCode,
        taxNameAr: taxCodeInfo?.nameAr || 'ضريبة القيمة المضافة',
        taxNameEn: taxCodeInfo?.nameEn || 'VAT',
        taxRate: taxCalculation.taxRate,
        taxableAmount: taxCalculation.taxableAmount,
        taxAmount: taxCalculation.taxAmount,
        zatcaCategory: taxCalculation.zatcaCategory,
      });
    }
  }

  // تقريب القيم وتحويلها إلى مصفوفة
  return Array.from(summaryMap.values()).map((summary) => ({
    ...summary,
    taxableAmount: Math.round(summary.taxableAmount * 100) / 100,
    taxAmount: Math.round(summary.taxAmount * 100) / 100,
  }));
}

// ============================================
// وظائف مساعدة
// ============================================

/**
 * حساب الضريبة من مبلغ شامل
 */
export function extractTaxFromInclusive(amount: number, taxRate: number = 15): {
  netAmount: number;
  taxAmount: number;
} {
  const taxAmount = amount * (taxRate / (100 + taxRate));
  const netAmount = amount - taxAmount;

  return {
    netAmount: Math.round(netAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}

/**
 * إضافة الضريبة إلى مبلغ
 */
export function addTaxToAmount(amount: number, taxRate: number = 15): {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const taxAmount = amount * (taxRate / 100);
  const totalAmount = amount + taxAmount;

  return {
    netAmount: Math.round(amount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * التحقق من الرقم الضريبي السعودي
 */
export function validateSaudiVATNumber(vatNumber: string): boolean {
  // الرقم الضريبي السعودي يبدأ بـ 3 ويتكون من 15 رقم
  const vatRegex = /^3\d{14}$/;
  return vatRegex.test(vatNumber);
}

/**
 * تنسيق الرقم الضريبي للعرض
 */
export function formatVATNumber(vatNumber: string): string {
  if (!vatNumber || vatNumber.length !== 15) {
    return vatNumber;
  }
  // تنسيق: 3XXXXXXXXXXXXX
  return vatNumber;
}

/**
 * مسح كاش الأكواد الضريبية
 */
export function clearTaxCodeCache(): void {
  taxCodeCache.clear();
  cacheTimestamps.clear();
  logger.debug('تم مسح كاش الأكواد الضريبية');
}

/**
 * تهيئة الأكواد الضريبية الافتراضية لشركة جديدة
 */
export async function initializeDefaultTaxCodes(companyId: string): Promise<void> {
  const defaultCodes = [
    {
      companyId,
      code: 'VAT15',
      nameAr: 'ضريبة القيمة المضافة 15%',
      nameEn: 'VAT 15%',
      rate: new Decimal(15),
      taxType: 'vat',
      zatcaCategory: 'STANDARD',
      isDefaultSales: true,
      isDefaultPurchase: true,
      isActive: true,
    },
    {
      companyId,
      code: 'VAT0',
      nameAr: 'ضريبة القيمة المضافة - معدل صفر',
      nameEn: 'VAT Zero Rate',
      rate: new Decimal(0),
      taxType: 'vat',
      zatcaCategory: 'ZERO_RATE',
      isDefaultSales: false,
      isDefaultPurchase: false,
      isActive: true,
    },
    {
      companyId,
      code: 'EXEMPT',
      nameAr: 'معفاة من الضريبة',
      nameEn: 'Tax Exempt',
      rate: new Decimal(0),
      taxType: 'vat',
      zatcaCategory: 'EXEMPT',
      isDefaultSales: false,
      isDefaultPurchase: false,
      isActive: true,
    },
    {
      companyId,
      code: 'OUTSCOPE',
      nameAr: 'خارج نطاق الضريبة',
      nameEn: 'Out of Scope',
      rate: new Decimal(0),
      taxType: 'vat',
      zatcaCategory: 'OUT_OF_SCOPE',
      isDefaultSales: false,
      isDefaultPurchase: false,
      isActive: true,
    },
  ];

  for (const code of defaultCodes) {
    const existing = await prisma.taxCode.findFirst({
      where: { companyId, code: code.code },
    });

    if (!existing) {
      await prisma.taxCode.create({ data: code });
      logger.info('تم إنشاء كود ضريبي افتراضي', { code: code.code, companyId });
    }
  }
}

// تصدير افتراضي
export default {
  getTaxCodeInfo,
  getDefaultSalesTaxCode,
  calculateTaxForLine,
  calculateTaxForLineAsync,
  calculateTaxForLines,
  calculateInvoiceTaxSummary,
  extractTaxFromInclusive,
  addTaxToAmount,
  validateSaudiVATNumber,
  formatVATNumber,
  clearTaxCodeCache,
  initializeDefaultTaxCodes,
};
