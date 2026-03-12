/**
 * Mayas ERP - Sales Invoices Service
 * خدمة فواتير المبيعات
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لفواتير المبيعات:
 * - إنشاء فاتورة جديدة
 * - تحديث فاتورة
 * - إلغاء فاتورة
 * - تأكيد فاتورة
 * - ترحيل فاتورة
 * - جلب فواتير
 * - إدارة الدفعات
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  SalesInvoice,
  SalesInvoiceWithRelations,
  SalesInvoiceLine,
  SalesInvoiceLineWithRelations,
  SalesPayment,
  CreateSalesInvoiceRequest,
  CreateSalesInvoiceLineInput,
  CreateSalesPaymentInput,
  ListSalesInvoicesQuery,
  PaginatedSalesInvoicesResult,
  SalesInvoiceSearchFilters,
  InvoiceStatus,
  PaymentStatus,
  InvoiceType,
} from '@/types/sales';

// ============================================
// الأخطاء المخصصة
// ============================================

/**
 * خطأ الفاتورة غير موجودة
 */
export class InvoiceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`الفاتورة غير موجودة: ${identifier}`);
    this.name = 'InvoiceNotFoundError';
  }
}

/**
 * خطأ تكرار رقم الفاتورة
 */
export class DuplicateInvoiceNumberError extends Error {
  constructor(invoiceNo: string) {
    super(`رقم الفاتورة موجود مسبقاً: ${invoiceNo}`);
    this.name = 'DuplicateInvoiceNumberError';
  }
}

/**
 * خطأ الصنف غير متوفر
 */
export class InsufficientStockError extends Error {
  constructor(itemId: string, requested: number, available: number) {
    super(`الرصيد غير كافي للصنف ${itemId}. المطلوب: ${requested}, المتاح: ${available}`);
    this.name = 'InsufficientStockError';
  }
}

/**
 * خطأ في حالة الفاتورة
 */
export class InvalidInvoiceStatusError extends Error {
  constructor(currentStatus: InvoiceStatus, action: string) {
    super(`لا يمكن ${action} والفاتورة في حالة ${currentStatus}`);
    this.name = 'InvalidInvoiceStatusError';
  }
}

/**
 * خطأ في مبلغ الدفع
 */
export class InvalidPaymentAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPaymentAmountError';
  }
}

// ============================================
// دوال مساعدة
// ============================================

/**
 * تحويل Decimal إلى number
 */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value);
}

/**
 * تحويل قيمة إلى Decimal
 */
function toDecimal(value: number | undefined | null): Prisma.Decimal {
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

/**
 * توليد رقم فاتورة تسلسلي
 */
async function generateInvoiceNumber(
  companyId: string,
  branchId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // جلب آخر رقم فاتورة للفرع
  const lastInvoice = await prisma.salesInvoice.findFirst({
    where: {
      companyId,
      branchId,
      invoiceNo: {
        startsWith: `INV-${year}${month}-`,
      },
    },
    orderBy: {
      invoiceNo: 'desc',
    },
    select: {
      invoiceNo: true,
    },
  });

  let sequence = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNo.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `INV-${year}${month}-${String(sequence).padStart(6, '0')}`;
}

/**
 * بناء شرط البحث من الفلاتر
 */
function buildWhereClause(
  companyId: string,
  filters?: SalesInvoiceSearchFilters
): Prisma.SalesInvoiceWhereInput {
  const where: Prisma.SalesInvoiceWhereInput = {
    companyId,
  };

  if (filters) {
    // البحث النصي
    if (filters.query) {
      where.OR = [
        { invoiceNo: { contains: filters.query, mode: 'insensitive' } },
        { notes: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // فلاتر مباشرة
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

    // فلتر نطاق التاريخ
    if (filters.dateFrom || filters.dateTo) {
      where.invoiceDate = {};
      if (filters.dateFrom) {
        where.invoiceDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.invoiceDate.lte = filters.dateTo;
      }
    }

    // فلتر نطاق المبلغ
    if (filters.amountFrom !== undefined || filters.amountTo !== undefined) {
      where.totalAmount = {};
      if (filters.amountFrom !== undefined) {
        where.totalAmount.gte = toDecimal(filters.amountFrom);
      }
      if (filters.amountTo !== undefined) {
        where.totalAmount.lte = toDecimal(filters.amountTo);
      }
    }
  }

  return where;
}

/**
 * التحقق من توفر المخزون
 */
async function checkStockAvailability(
  warehouseId: string,
  lines: CreateSalesInvoiceLineInput[]
): Promise<void> {
  for (const line of lines) {
    const stockBalance = await prisma.stockBalance.findFirst({
      where: {
        warehouseId,
        itemId: line.itemId,
      },
    });

    if (!stockBalance) {
      const item = await prisma.item.findUnique({
        where: { id: line.itemId },
        select: { allowNegativeStock: true },
      });

      if (!item?.allowNegativeStock) {
        throw new InsufficientStockError(line.itemId, line.qty, 0);
      }
    } else {
      const available = decimalToNumber(stockBalance.qtyAvailable);
      if (available < line.qty && !stockBalance.item?.allowNegativeStock) {
        throw new InsufficientStockError(line.itemId, line.qty, available);
      }
    }
  }
}

/**
 * حساب ضرائب البند
 */
async function calculateLineTax(
  itemId: string,
  taxCodeId: string | undefined,
  lineTotal: number
): Promise<{ taxAmount: number; taxCodeId: string | null }> {
  let taxCode: string | null = taxCodeId || null;
  let taxRate = 0;

  if (taxCodeId) {
    const tax = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
    });
    if (tax) {
      taxRate = decimalToNumber(tax.rate);
    }
  } else {
    // جلب كود الضريبة الافتراضي للصنف
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { taxCode: true },
    });
    if (item?.taxCode) {
      taxCode = item.taxCodeId;
      taxRate = decimalToNumber(item.taxCode.rate);
    }
  }

  const taxAmount = lineTotal * (taxRate / 100);

  return { taxAmount, taxCodeId: taxCode };
}

/**
 * حساب أسعار وتكاليف البند
 */
async function calculateLineAmounts(
  line: CreateSalesInvoiceLineInput,
  priceTierId?: string | null
): Promise<{
  unitPrice: number;
  cost: number;
  discountAmount: number;
  lineTotal: number;
  taxAmount: number;
  taxCodeId: string | null;
}> {
  // جلب معلومات الصنف
  const item = await prisma.item.findUnique({
    where: { id: line.itemId },
    include: {
      prices: {
        where: {
          priceTierId: priceTierId || undefined,
          isActive: true,
        },
        orderBy: {
          minQty: 'asc',
        },
      },
      stockBalances: {
        take: 1,
      },
    },
  });

  if (!item) {
    throw new Error(`الصنف غير موجود: ${line.itemId}`);
  }

  // تحديد سعر الوحدة
  let unitPrice = line.unitPrice || 0;
  if (!line.unitPrice) {
    // البحث عن السعر المناسب حسب الكمية
    const price = item.prices.find((p) => decimalToNumber(p.minQty) <= line.qty);
    if (price) {
      unitPrice = decimalToNumber(price.price);
    }
  }

  // حساب الخصم
  const discountPercent = line.discountPercent || 0;
  const discountAmount = line.discountAmount || (unitPrice * line.qty * discountPercent / 100);

  // حساب إجمالي البند
  const lineTotal = (unitPrice * line.qty) - discountAmount;

  // حساب الضريبة
  const { taxAmount, taxCodeId } = await calculateLineTax(
    line.itemId,
    line.taxCodeId,
    lineTotal
  );

  // جلب التكلفة
  const cost = item.stockBalances[0]
    ? decimalToNumber(item.stockBalances[0].avgCost)
    : 0;

  return {
    unitPrice,
    cost,
    discountAmount,
    lineTotal,
    taxAmount,
    taxCodeId,
  };
}

// ============================================
// العمليات الأساسية (CRUD)
// ============================================

/**
 * إنشاء فاتورة مبيعات جديدة
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات الفاتورة
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns الفاتورة المُنشأة
 */
export async function createSalesInvoice(
  companyId: string,
  data: CreateSalesInvoiceRequest,
  userId?: string
): Promise<SalesInvoiceWithRelations> {
  // التحقق من توفر المخزون للأصناف التي تتتبع المخزون
  await checkStockAvailability(data.warehouseId, data.lines);

  // توليد رقم الفاتورة
  const invoiceNo = await generateInvoiceNumber(companyId, data.branchId);

  // حساب مبالغ البنود
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalCost = 0;

  const linesData: Prisma.SalesInvoiceLineCreateManySalesInvoiceInput[] = [];

  for (const line of data.lines) {
    const amounts = await calculateLineAmounts(line);

    subtotal += amounts.lineTotal;
    totalTax += amounts.taxAmount;
    totalDiscount += amounts.discountAmount;
    totalCost += amounts.cost * line.qty;

    linesData.push({
      itemId: line.itemId,
      description: line.description,
      qty: toDecimal(line.qty),
      unitId: line.unitId,
      unitFactor: toDecimal(line.unitFactor || 1),
      baseQty: toDecimal(line.qty * (line.unitFactor || 1)),
      unitPrice: toDecimal(amounts.unitPrice),
      cost: toDecimal(amounts.cost),
      discountPercent: toDecimal(line.discountPercent || 0),
      discountAmount: toDecimal(amounts.discountAmount),
      taxCodeId: amounts.taxCodeId,
      taxAmount: toDecimal(amounts.taxAmount),
      lineTotal: toDecimal(amounts.lineTotal),
      fromBinId: line.fromBinId,
      isManualPrice: line.isManualPrice || false,
      notes: line.notes,
    });
  }

  // تطبيق خصم إضافي على مستوى الفاتورة
  const additionalDiscount = data.discountAmount || 0;
  const totalAmount = subtotal + totalTax - additionalDiscount;

  // حساب المبلغ المدفوع
  let paidAmount = 0;
  if (data.payments) {
    paidAmount = data.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  // تحديد حالة الدفع
  let paymentStatus: PaymentStatus = 'unpaid';
  if (paidAmount >= totalAmount) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }

  // تحديد حالة الفاتورة
  const status: InvoiceStatus = paymentStatus === 'paid' ? 'confirmed' : 'draft';

  // إنشاء الفاتورة مع البنود والدفعات
  const invoice = await prisma.salesInvoice.create({
    data: {
      companyId,
      branchId: data.branchId,
      warehouseId: data.warehouseId,
      posTerminalId: data.posTerminalId,
      invoiceNo,
      invoiceDate: new Date(),
      invoiceType: data.invoiceType || 'credit',
      invoiceSubtype: data.invoiceSubtype,
      customerId: data.customerId,
      cashierUserId: userId,
      currencyCode: data.currencyCode || 'SAR',
      exchangeRate: toDecimal(data.exchangeRate || 1),
      paymentStatus,
      paymentMethod: data.paymentMethod,
      dueDate: data.dueDate,
      subtotal: toDecimal(subtotal),
      discountAmount: toDecimal(additionalDiscount),
      discountPercent: toDecimal(data.discountPercent || 0),
      taxAmount: toDecimal(totalTax),
      roundAmount: toDecimal(0),
      totalAmount: toDecimal(totalAmount),
      paidAmount: toDecimal(paidAmount),
      balanceDue: toDecimal(totalAmount - paidAmount),
      costTotal: toDecimal(totalCost),
      grossProfit: toDecimal(subtotal - totalCost),
      status,
      notes: data.notes,
      createdById: userId,
      lines: {
        createMany: {
          data: linesData,
        },
      },
      payments: data.payments
        ? {
            createMany: {
              data: data.payments.map((payment) => ({
                companyId,
                branchId: data.branchId,
                paymentDate: new Date(),
                paymentMethod: payment.paymentMethod,
                amount: toDecimal(payment.amount),
                cashboxId: payment.cashboxId,
                bankAccountId: payment.bankAccountId,
                referenceNo: payment.referenceNo,
                notes: payment.notes,
                createdById: userId,
              })),
            },
          }
        : undefined,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
  });

  // تحديث رصيد المخزون
  await updateStockAfterInvoice(companyId, data.warehouseId, linesData, false);

  return transformInvoice(invoice);
}

/**
 * تحديث رصيد المخزون بعد إنشاء/إلغاء فاتورة
 */
async function updateStockAfterInvoice(
  companyId: string,
  warehouseId: string,
  lines: Prisma.SalesInvoiceLineCreateManySalesInvoiceInput[],
  isReversal: boolean
): Promise<void> {
  for (const line of lines) {
    const qty = decimalToNumber(line.qty);
    const adjustment = isReversal ? qty : -qty;

    // البحث عن رصيد المخزون
    const stockBalance = await prisma.stockBalance.findFirst({
      where: {
        warehouseId,
        itemId: line.itemId,
      },
    });

    if (stockBalance) {
      // تحديث الرصيد
      const newQtyOnHand = decimalToNumber(stockBalance.qtyOnHand) + adjustment;
      const newQtyAvailable = newQtyOnHand - decimalToNumber(stockBalance.qtyReserved);

      await prisma.stockBalance.update({
        where: { id: stockBalance.id },
        data: {
          qtyOnHand: toDecimal(newQtyOnHand),
          qtyAvailable: toDecimal(newQtyAvailable),
        },
      });
    } else if (!isReversal) {
      // إنشاء رصيد جديد (سالب إذا كان مسموحاً)
      await prisma.stockBalance.create({
        data: {
          companyId,
          branchId: warehouseId, // سيتم تحديثه لاحقاً
          warehouseId,
          itemId: line.itemId!,
          qtyOnHand: toDecimal(adjustment),
          qtyReserved: toDecimal(0),
          qtyAvailable: toDecimal(adjustment),
          avgCost: toDecimal(0),
          lastCost: toDecimal(0),
        },
      });
    }
  }
}

/**
 * تحويل بيانات الفاتورة من Prisma إلى النوع المطلوب
 */
function transformInvoice(invoice: any): SalesInvoiceWithRelations {
  return {
    ...invoice,
    exchangeRate: decimalToNumber(invoice.exchangeRate),
    subtotal: decimalToNumber(invoice.subtotal),
    discountAmount: decimalToNumber(invoice.discountAmount),
    discountPercent: decimalToNumber(invoice.discountPercent),
    taxAmount: decimalToNumber(invoice.taxAmount),
    roundAmount: decimalToNumber(invoice.roundAmount),
    totalAmount: decimalToNumber(invoice.totalAmount),
    paidAmount: decimalToNumber(invoice.paidAmount),
    balanceDue: decimalToNumber(invoice.balanceDue),
    costTotal: decimalToNumber(invoice.costTotal),
    grossProfit: decimalToNumber(invoice.grossProfit),
    lines: invoice.lines?.map((line: any) => ({
      ...line,
      qty: decimalToNumber(line.qty),
      unitFactor: decimalToNumber(line.unitFactor),
      baseQty: decimalToNumber(line.baseQty),
      unitPrice: decimalToNumber(line.unitPrice),
      cost: decimalToNumber(line.cost),
      discountPercent: decimalToNumber(line.discountPercent),
      discountAmount: decimalToNumber(line.discountAmount),
      taxAmount: decimalToNumber(line.taxAmount),
      lineTotal: decimalToNumber(line.lineTotal),
    })),
    payments: invoice.payments?.map((payment: any) => ({
      ...payment,
      amount: decimalToNumber(payment.amount),
    })),
  };
}

/**
 * تأكيد فاتورة المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @param userId - معرف المستخدم
 * @returns الفاتورة المُؤكدة
 */
export async function confirmSalesInvoice(
  companyId: string,
  invoiceId: string,
  userId?: string
): Promise<SalesInvoiceWithRelations> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  if (invoice.status !== 'draft') {
    throw new InvalidInvoiceStatusError(invoice.status as InvoiceStatus, 'تأكيد الفاتورة');
  }

  const updated = await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      status: 'confirmed',
      updatedBy: userId,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
  });

  return transformInvoice(updated);
}

/**
 * ترحيل فاتورة المبيعات (إنشاء قيود محاسبية)
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @param userId - معرف المستخدم
 * @returns الفاتورة المُرحلة
 */
export async function postSalesInvoice(
  companyId: string,
  invoiceId: string,
  userId?: string
): Promise<SalesInvoiceWithRelations> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      lines: true,
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  if (invoice.status === 'posted') {
    throw new InvalidInvoiceStatusError(invoice.status as InvoiceStatus, 'ترحيل الفاتورة');
  }

  // TODO: إنشاء القيود المحاسبية هنا

  const updated = await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      status: 'posted',
      postedAt: new Date(),
      updatedBy: userId,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
  });

  return transformInvoice(updated);
}

/**
 * إلغاء فاتورة المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @param userId - معرف المستخدم
 * @param reason - سبب الإلغاء
 * @returns الفاتورة المُلغاة
 */
export async function cancelSalesInvoice(
  companyId: string,
  invoiceId: string,
  userId?: string,
  reason?: string
): Promise<SalesInvoiceWithRelations> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      lines: true,
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  if (invoice.status === 'cancelled') {
    throw new InvalidInvoiceStatusError(invoice.status as InvoiceStatus, 'إلغاء الفاتورة');
  }

  // إرجاع المخزون
  const linesData: Prisma.SalesInvoiceLineCreateManySalesInvoiceInput[] = invoice.lines.map((line) => ({
    itemId: line.itemId,
    qty: line.qty,
  }));

  await updateStockAfterInvoice(companyId, invoice.warehouseId, linesData as any, true);

  // إلغاء الفاتورة
  const updated = await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      status: 'cancelled',
      notes: reason ? `${invoice.notes || ''}\nسبب الإلغاء: ${reason}` : invoice.notes,
      updatedBy: userId,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
  });

  return transformInvoice(updated);
}

/**
 * إضافة دفعة للفاتورة
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @param payment - بيانات الدفعة
 * @param userId - معرف المستخدم
 * @returns الدفعة المُضافة
 */
export async function addPaymentToInvoice(
  companyId: string,
  invoiceId: string,
  payment: CreateSalesPaymentInput,
  userId?: string
): Promise<SalesPayment> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  if (invoice.status === 'cancelled') {
    throw new InvalidInvoiceStatusError(invoice.status as InvoiceStatus, 'إضافة دفعة');
  }

  const currentPaid = decimalToNumber(invoice.paidAmount);
  const totalAmount = decimalToNumber(invoice.totalAmount);
  const newPaidAmount = currentPaid + payment.amount;

  if (newPaidAmount > totalAmount) {
    throw new InvalidPaymentAmountError(
      `مبلغ الدفعة يتجاوز المبلغ المستحق. المستحق: ${totalAmount - currentPaid}`
    );
  }

  // إنشاء الدفعة
  const salesPayment = await prisma.salesPayment.create({
    data: {
      companyId,
      branchId: invoice.branchId,
      salesInvoiceId: invoiceId,
      paymentDate: new Date(),
      paymentMethod: payment.paymentMethod,
      amount: toDecimal(payment.amount),
      cashboxId: payment.cashboxId,
      bankAccountId: payment.bankAccountId,
      referenceNo: payment.referenceNo,
      notes: payment.notes,
      createdById: userId,
    },
  });

  // تحديث حالة الدفع
  let paymentStatus: PaymentStatus = 'partial';
  if (newPaidAmount >= totalAmount) {
    paymentStatus = 'paid';
  }

  await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: toDecimal(newPaidAmount),
      balanceDue: toDecimal(totalAmount - newPaidAmount),
      paymentStatus,
    },
  });

  return {
    ...salesPayment,
    amount: decimalToNumber(salesPayment.amount),
  };
}

/**
 * جلب فاتورة مبيعات واحدة
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @param includeRelations - تضمين العلاقات
 * @returns الفاتورة المطلوبة
 */
export async function getSalesInvoice(
  companyId: string,
  invoiceId: string,
  includeRelations: boolean = true
): Promise<SalesInvoiceWithRelations> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: includeRelations
      ? {
          lines: {
            include: {
              item: true,
              unit: true,
              taxCode: true,
            },
          },
          payments: true,
          customer: {
            select: {
              id: true,
              code: true,
              nameAr: true,
              nameEn: true,
              phone: true,
              taxNumber: true,
            },
          },
          branch: {
            select: {
              id: true,
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        }
      : undefined,
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  return transformInvoice(invoice);
}

/**
 * جلب فاتورة برقم الفاتورة
 * 
 * @param companyId - معرف الشركة
 * @param invoiceNo - رقم الفاتورة
 * @returns الفاتورة المطلوبة
 */
export async function getSalesInvoiceByNumber(
  companyId: string,
  invoiceNo: string
): Promise<SalesInvoiceWithRelations> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      companyId,
      invoiceNo,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceNo);
  }

  return transformInvoice(invoice);
}

/**
 * قائمة فواتير المبيعات مع التصفح والترتيب
 * 
 * @param companyId - معرف الشركة
 * @param query - معايير البحث والتصفح
 * @returns قائمة الفواتير مع معلومات التصفح
 */
export async function listSalesInvoices(
  companyId: string,
  query: ListSalesInvoicesQuery = {}
): Promise<PaginatedSalesInvoicesResult> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeCustomer = true,
    includeLines = false,
    filters,
  } = query;

  const where = buildWhereClause(companyId, filters);

  // تحديد العلاقات المطلوبة
  const include: Prisma.SalesInvoiceInclude = {};
  if (includeCustomer) {
    include.customer = {
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        phone: true,
        taxNumber: true,
      },
    };
  }
  if (includeLines) {
    include.lines = {
      include: {
        item: true,
        unit: true,
      },
    };
  }

  // حساب العدد الإجمالي
  const total = await prisma.salesInvoice.count({ where });

  // جلب البيانات
  const invoices = await prisma.salesInvoice.findMany({
    where,
    include: Object.keys(include).length > 0 ? include : undefined,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    invoices: invoices.map(transformInvoice),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * البحث في فواتير المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param query - نص البحث
 * @param limit - عدد النتائج
 * @returns قائمة الفواتير
 */
export async function searchSalesInvoices(
  companyId: string,
  query: string,
  limit: number = 20
): Promise<SalesInvoiceWithRelations[]> {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      OR: [
        { invoiceNo: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
    take: limit,
    orderBy: {
      invoiceDate: 'desc',
    },
  });

  return invoices.map(transformInvoice);
}

/**
 * طباعة فاتورة المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @returns رقم الطباعة الجديد
 */
export async function printSalesInvoice(
  companyId: string,
  invoiceId: string
): Promise<number> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  });

  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  const updated = await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      printedCount: { increment: 1 },
    },
  });

  return updated.printedCount;
}

/**
 * جلب فواتير العميل
 * 
 * @param companyId - معرف الشركة
 * @param customerId - معرف العميل
 * @param status - فلترة حسب الحالة (اختياري)
 * @returns قائمة فواتير العميل
 */
export async function getCustomerInvoices(
  companyId: string,
  customerId: string,
  status?: InvoiceStatus
): Promise<SalesInvoiceWithRelations[]> {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      customerId,
      status,
    },
    include: {
      lines: {
        include: {
          item: true,
        },
      },
      payments: true,
    },
    orderBy: {
      invoiceDate: 'desc',
    },
  });

  return invoices.map(transformInvoice);
}

/**
 * جلب الفواتير غير المدفوعة
 * 
 * @param companyId - معرف الشركة
 * @param customerId - معرف العميل (اختياري)
 * @returns قائمة الفواتير غير المدفوعة
 */
export async function getUnpaidInvoices(
  companyId: string,
  customerId?: string
): Promise<SalesInvoiceWithRelations[]> {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      customerId,
      paymentStatus: { in: ['unpaid', 'partial'] },
      status: { not: 'cancelled' },
    },
    include: {
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          phone: true,
          taxNumber: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  return invoices.map(transformInvoice);
}
