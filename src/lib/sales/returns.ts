/**
 * Mayas ERP - Sales Returns Service
 * خدمة مرتجعات المبيعات
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لمرتجعات المبيعات:
 * - إنشاء مرتجع جديد
 * - تأكيد مرتجع
 * - إلغاء مرتجع
 * - جلب مرتجعات
 * - إحصائيات المرتجعات
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  SalesReturn,
  SalesReturnWithRelations,
  SalesReturnLine,
  SalesReturnLineWithRelations,
  CreateSalesReturnRequest,
  CreateSalesReturnLineInput,
  ReturnStatus,
  RefundMethod,
  ReturnReason,
} from '@/types/sales';

// ============================================
// الأخطاء المخصصة
// ============================================

/**
 * خطأ المرتجع غير موجود
 */
export class ReturnNotFoundError extends Error {
  constructor(identifier: string) {
    super(`المرتجع غير موجود: ${identifier}`);
    this.name = 'ReturnNotFoundError';
  }
}

/**
 * خطأ الفاتورة الأصلية غير موجودة
 */
export class OriginalInvoiceNotFoundError extends Error {
  constructor(invoiceId: string) {
    super(`الفاتورة الأصلية غير موجودة: ${invoiceId}`);
    this.name = 'OriginalInvoiceNotFoundError';
  }
}

/**
 * خطأ تجاوز الكمية المرتجعة
 */
export class ExceededReturnQuantityError extends Error {
  constructor(itemId: string, requested: number, available: number) {
    super(
      `الكمية المرتجعة تتجاوز الكمية المتاحة للصنف ${itemId}. المطلوب: ${requested}, المتاح: ${available}`
    );
    this.name = 'ExceededReturnQuantityError';
  }
}

/**
 * خطأ في حالة المرتجع
 */
export class InvalidReturnStatusError extends Error {
  constructor(currentStatus: ReturnStatus, action: string) {
    super(`لا يمكن ${action} والمرتجع في حالة ${currentStatus}`);
    this.name = 'InvalidReturnStatusError';
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
 * توليد رقم مرتجع تسلسلي
 */
async function generateReturnNumber(
  companyId: string,
  branchId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // جلب آخر رقم مرتجع للفرع
  const lastReturn = await prisma.salesReturn.findFirst({
    where: {
      companyId,
      branchId,
      returnNo: {
        startsWith: `RET-${year}${month}-`,
      },
    },
    orderBy: {
      returnNo: 'desc',
    },
    select: {
      returnNo: true,
    },
  });

  let sequence = 1;
  if (lastReturn) {
    const parts = lastReturn.returnNo.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `RET-${year}${month}-${String(sequence).padStart(6, '0')}`;
}

/**
 * التحقق من صحة بنود المرتجع مقابل الفاتورة الأصلية
 */
async function validateReturnLines(
  originalInvoiceId: string,
  lines: CreateSalesReturnLineInput[]
): Promise<void> {
  // جلب الفاتورة الأصلية مع البنود
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: originalInvoiceId },
    include: {
      lines: true,
      returns: {
        where: { status: { not: 'cancelled' } },
        include: { lines: true },
      },
    },
  });

  if (!invoice) {
    throw new OriginalInvoiceNotFoundError(originalInvoiceId);
  }

  // حساب الكميات المرتجعة سابقاً لكل صنف
  const returnedQtys: Record<string, number> = {};
  for (const ret of invoice.returns) {
    for (const line of ret.lines) {
      if (!returnedQtys[line.itemId]) {
        returnedQtys[line.itemId] = 0;
      }
      returnedQtys[line.itemId] += decimalToNumber(line.qty);
    }
  }

  // التحقق من كل بند
  for (const line of lines) {
    const invoiceLine = invoice.lines.find((l) => l.itemId === line.itemId);
    if (!invoiceLine) {
      throw new Error(`الصنف ${line.itemId} غير موجود في الفاتورة الأصلية`);
    }

    const originalQty = decimalToNumber(invoiceLine.qty);
    const alreadyReturned = returnedQtys[line.itemId] || 0;
    const availableToReturn = originalQty - alreadyReturned;

    if (line.qty > availableToReturn) {
      throw new ExceededReturnQuantityError(line.itemId, line.qty, availableToReturn);
    }
  }
}

/**
 * حساب الضرائب للبند المرتجع
 */
async function calculateReturnLineTax(
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
 * تحويل بيانات المرتجع من Prisma إلى النوع المطلوب
 */
function transformReturn(ret: any): SalesReturnWithRelations {
  return {
    ...ret,
    subtotal: decimalToNumber(ret.subtotal),
    discountAmount: decimalToNumber(ret.discountAmount),
    taxAmount: decimalToNumber(ret.taxAmount),
    totalAmount: decimalToNumber(ret.totalAmount),
    lines: ret.lines?.map((line: any) => ({
      ...line,
      qty: decimalToNumber(line.qty),
      unitPrice: decimalToNumber(line.unitPrice),
      cost: decimalToNumber(line.cost),
      discountAmount: decimalToNumber(line.discountAmount),
      taxAmount: decimalToNumber(line.taxAmount),
      lineTotal: decimalToNumber(line.lineTotal),
    })),
  };
}

/**
 * تحديث رصيد المخزون بعد مرتجع
 */
async function updateStockAfterReturn(
  companyId: string,
  warehouseId: string,
  lines: Prisma.SalesReturnLineCreateManySalesReturnInput[],
  isReversal: boolean
): Promise<void> {
  for (const line of lines) {
    const qty = decimalToNumber(line.qty!);
    const adjustment = isReversal ? -qty : qty;

    // البحث عن رصيد المخزون
    const stockBalance = await prisma.stockBalance.findFirst({
      where: {
        warehouseId,
        itemId: line.itemId!,
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
      // إنشاء رصيد جديد
      await prisma.stockBalance.create({
        data: {
          companyId,
          branchId: warehouseId,
          warehouseId,
          itemId: line.itemId!,
          qtyOnHand: toDecimal(adjustment),
          qtyReserved: toDecimal(0),
          qtyAvailable: toDecimal(adjustment),
          avgCost: toDecimal(line.cost || 0),
          lastCost: toDecimal(line.cost || 0),
        },
      });
    }
  }
}

// ============================================
// العمليات الأساسية (CRUD)
// ============================================

/**
 * إنشاء مرتجع مبيعات جديد
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات المرتجع
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns المرتجع المُنشأ
 */
export async function createSalesReturn(
  companyId: string,
  data: CreateSalesReturnRequest,
  userId?: string
): Promise<SalesReturnWithRelations> {
  // التحقق من الفاتورة الأصلية إذا تم تحديدها
  if (data.originalInvoiceId) {
    await validateReturnLines(data.originalInvoiceId, data.lines);
  }

  // توليد رقم المرتجع
  const returnNo = await generateReturnNumber(companyId, data.branchId);

  // حساب مبالغ البنود
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  const linesData: Prisma.SalesReturnLineCreateManySalesReturnInput[] = [];

  for (const line of data.lines) {
    // حساب الخصم
    const discountAmount = line.discountAmount || 0;

    // حساب إجمالي البند
    const lineTotal = line.unitPrice * line.qty - discountAmount;

    // حساب الضريبة
    const { taxAmount, taxCodeId } = await calculateReturnLineTax(
      line.itemId,
      line.taxCodeId,
      lineTotal
    );

    subtotal += lineTotal;
    totalTax += taxAmount;
    totalDiscount += discountAmount;

    // جلب التكلفة
    let cost = line.cost || 0;
    if (!line.cost) {
      const stockBalance = await prisma.stockBalance.findFirst({
        where: {
          warehouseId: data.warehouseId,
          itemId: line.itemId,
        },
      });
      if (stockBalance) {
        cost = decimalToNumber(stockBalance.avgCost);
      }
    }

    linesData.push({
      itemId: line.itemId,
      originalLineId: line.originalLineId,
      qty: toDecimal(line.qty),
      unitId: line.unitId,
      unitPrice: toDecimal(line.unitPrice),
      cost: toDecimal(cost),
      discountAmount: toDecimal(discountAmount),
      taxCodeId,
      taxAmount: toDecimal(taxAmount),
      lineTotal: toDecimal(lineTotal),
      toBinId: line.toBinId,
      returnReason: line.returnReason,
    });
  }

  const totalAmount = subtotal + totalTax;

  // إنشاء المرتجع مع البنود
  const salesReturn = await prisma.salesReturn.create({
    data: {
      companyId,
      branchId: data.branchId,
      warehouseId: data.warehouseId,
      returnNo,
      returnDate: new Date(),
      customerId: data.customerId,
      originalInvoiceId: data.originalInvoiceId,
      refundMethod: data.refundMethod,
      subtotal: toDecimal(subtotal),
      discountAmount: toDecimal(totalDiscount),
      taxAmount: toDecimal(totalTax),
      totalAmount: toDecimal(totalAmount),
      status: 'draft',
      notes: data.notes,
      createdById: userId,
      lines: {
        createMany: {
          data: linesData,
        },
      },
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
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

  return transformReturn(salesReturn);
}

/**
 * تأكيد مرتجع المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param returnId - معرف المرتجع
 * @param userId - معرف المستخدم
 * @returns المرتجع المُؤكد
 */
export async function confirmSalesReturn(
  companyId: string,
  returnId: string,
  userId?: string
): Promise<SalesReturnWithRelations> {
  const salesReturn = await prisma.salesReturn.findFirst({
    where: {
      id: returnId,
      companyId,
    },
    include: {
      lines: true,
    },
  });

  if (!salesReturn) {
    throw new ReturnNotFoundError(returnId);
  }

  if (salesReturn.status !== 'draft') {
    throw new InvalidReturnStatusError(salesReturn.status as ReturnStatus, 'تأكيد المرتجع');
  }

  // تحديث المخزون
  await updateStockAfterReturn(
    companyId,
    salesReturn.warehouseId,
    salesReturn.lines.map((line) => ({
      itemId: line.itemId,
      qty: line.qty,
      cost: line.cost,
    })) as any,
    false
  );

  // تأكيد المرتجع
  const updated = await prisma.salesReturn.update({
    where: { id: returnId },
    data: {
      status: 'confirmed',
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
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
      originalInvoice: true,
    },
  });

  return transformReturn(updated);
}

/**
 * إلغاء مرتجع المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param returnId - معرف المرتجع
 * @param userId - معرف المستخدم
 * @param reason - سبب الإلغاء
 * @returns المرتجع المُلغى
 */
export async function cancelSalesReturn(
  companyId: string,
  returnId: string,
  userId?: string,
  reason?: string
): Promise<SalesReturnWithRelations> {
  const salesReturn = await prisma.salesReturn.findFirst({
    where: {
      id: returnId,
      companyId,
    },
    include: {
      lines: true,
    },
  });

  if (!salesReturn) {
    throw new ReturnNotFoundError(returnId);
  }

  if (salesReturn.status === 'cancelled') {
    throw new InvalidReturnStatusError(salesReturn.status as ReturnStatus, 'إلغاء المرتجع');
  }

  // إذا كان المرتجع مؤكداً، نرجع المخزون
  if (salesReturn.status === 'confirmed') {
    await updateStockAfterReturn(
      companyId,
      salesReturn.warehouseId,
      salesReturn.lines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        cost: line.cost,
      })) as any,
      true
    );
  }

  // إلغاء المرتجع
  const updated = await prisma.salesReturn.update({
    where: { id: returnId },
    data: {
      status: 'cancelled',
      notes: reason ? `${salesReturn.notes || ''}\nسبب الإلغاء: ${reason}` : salesReturn.notes,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
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

  return transformReturn(updated);
}

/**
 * جلب مرتجع مبيعات واحد
 * 
 * @param companyId - معرف الشركة
 * @param returnId - معرف المرتجع
 * @param includeRelations - تضمين العلاقات
 * @returns المرتجع المطلوب
 */
export async function getSalesReturn(
  companyId: string,
  returnId: string,
  includeRelations: boolean = true
): Promise<SalesReturnWithRelations> {
  const salesReturn = await prisma.salesReturn.findFirst({
    where: {
      id: returnId,
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
          originalInvoice: {
            include: {
              lines: true,
            },
          },
        }
      : undefined,
  });

  if (!salesReturn) {
    throw new ReturnNotFoundError(returnId);
  }

  return transformReturn(salesReturn);
}

/**
 * جلب مرتجع برقم المرتجع
 * 
 * @param companyId - معرف الشركة
 * @param returnNo - رقم المرتجع
 * @returns المرتجع المطلوب
 */
export async function getSalesReturnByNumber(
  companyId: string,
  returnNo: string
): Promise<SalesReturnWithRelations> {
  const salesReturn = await prisma.salesReturn.findFirst({
    where: {
      companyId,
      returnNo,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
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

  if (!salesReturn) {
    throw new ReturnNotFoundError(returnNo);
  }

  return transformReturn(salesReturn);
}

/**
 * قائمة مرتجعات المبيعات
 * 
 * @param companyId - معرف الشركة
 * @param filters - معايير الفلترة
 * @param page - رقم الصفحة
 * @param pageSize - حجم الصفحة
 * @returns قائمة المرتجعات
 */
export async function listSalesReturns(
  companyId: string,
  filters?: {
    customerId?: string;
    branchId?: string;
    warehouseId?: string;
    status?: ReturnStatus;
    dateFrom?: Date;
    dateTo?: Date;
    originalInvoiceId?: string;
  },
  page: number = 1,
  pageSize: number = 20
): Promise<{
  returns: SalesReturnWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const where: Prisma.SalesReturnWhereInput = {
    companyId,
  };

  if (filters) {
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;
    if (filters.originalInvoiceId) where.originalInvoiceId = filters.originalInvoiceId;

    if (filters.dateFrom || filters.dateTo) {
      where.returnDate = {};
      if (filters.dateFrom) where.returnDate.gte = filters.dateFrom;
      if (filters.dateTo) where.returnDate.lte = filters.dateTo;
    }
  }

  const total = await prisma.salesReturn.count({ where });

  const returns = await prisma.salesReturn.findMany({
    where,
    include: {
      lines: {
        include: {
          item: true,
        },
      },
      customer: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
    orderBy: {
      returnDate: 'desc',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    returns: returns.map(transformReturn),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * جلب مرتجعات الفاتورة
 * 
 * @param companyId - معرف الشركة
 * @param invoiceId - معرف الفاتورة
 * @returns قائمة المرتجعات
 */
export async function getInvoiceReturns(
  companyId: string,
  invoiceId: string
): Promise<SalesReturnWithRelations[]> {
  const returns = await prisma.salesReturn.findMany({
    where: {
      companyId,
      originalInvoiceId: invoiceId,
    },
    include: {
      lines: {
        include: {
          item: true,
          unit: true,
        },
      },
    },
    orderBy: {
      returnDate: 'desc',
    },
  });

  return returns.map(transformReturn);
}

/**
 * جلب مرتجعات العميل
 * 
 * @param companyId - معرف الشركة
 * @param customerId - معرف العميل
 * @param status - فلترة حسب الحالة (اختياري)
 * @returns قائمة مرتجعات العميل
 */
export async function getCustomerReturns(
  companyId: string,
  customerId: string,
  status?: ReturnStatus
): Promise<SalesReturnWithRelations[]> {
  const returns = await prisma.salesReturn.findMany({
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
    },
    orderBy: {
      returnDate: 'desc',
    },
  });

  return returns.map(transformReturn);
}

/**
 * إحصائيات المرتجعات
 * 
 * @param companyId - معرف الشركة
 * @param filters - معايير الفلترة (اختياري)
 * @returns إحصائيات المرتجعات
 */
export async function getReturnsStatistics(
  companyId: string,
  filters?: {
    branchId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<{
  totalReturns: number;
  totalAmount: number;
  byReason: Record<ReturnReason, number>;
  byRefundMethod: Record<RefundMethod, number>;
  topReturnedItems: Array<{
    itemId: string;
    itemName: string;
    count: number;
    totalQty: number;
    totalAmount: number;
  }>;
}> {
  const where: Prisma.SalesReturnWhereInput = {
    companyId,
    status: 'confirmed',
  };

  if (filters) {
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.dateFrom || filters.dateTo) {
      where.returnDate = {};
      if (filters.dateFrom) where.returnDate.gte = filters.dateFrom;
      if (filters.dateTo) where.returnDate.lte = filters.dateTo;
    }
  }

  const returns = await prisma.salesReturn.findMany({
    where,
    include: {
      lines: {
        include: {
          item: true,
        },
      },
    },
  });

  // حساب الإحصائيات
  let totalAmount = 0;
  const byReason: Record<string, number> = {};
  const byRefundMethod: Record<string, number> = {};
  const itemCounts: Record<string, { count: number; qty: number; amount: number; name: string }> = {};

  for (const ret of returns) {
    totalAmount += decimalToNumber(ret.totalAmount);

    // حسب طريقة الاسترداد
    if (ret.refundMethod) {
      byRefundMethod[ret.refundMethod] = (byRefundMethod[ret.refundMethod] || 0) + 1;
    }

    for (const line of ret.lines) {
      // حسب سبب المرتجع
      if (line.returnReason) {
        byReason[line.returnReason] = (byReason[line.returnReason] || 0) + 1;
      }

      // إحصائيات الأصناف
      if (!itemCounts[line.itemId]) {
        itemCounts[line.itemId] = {
          count: 0,
          qty: 0,
          amount: 0,
          name: line.item?.nameAr || line.itemId,
        };
      }
      itemCounts[line.itemId].count += 1;
      itemCounts[line.itemId].qty += decimalToNumber(line.qty);
      itemCounts[line.itemId].amount += decimalToNumber(line.lineTotal);
    }
  }

  // ترتيب الأصناف الأكثر مرتجعاً
  const topReturnedItems = Object.entries(itemCounts)
    .map(([itemId, data]) => ({
      itemId,
      itemName: data.name,
      count: data.count,
      totalQty: data.qty,
      totalAmount: data.amount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalReturns: returns.length,
    totalAmount,
    byReason: byReason as Record<ReturnReason, number>,
    byRefundMethod: byRefundMethod as Record<RefundMethod, number>,
    topReturnedItems,
  };
}

/**
 * التحقق من إمكانية إرجاع صنف من فاتورة
 * 
 * @param invoiceId - معرف الفاتورة
 * @param itemId - معرف الصنف
 * @returns الكمية المتاحة للإرجاع
 */
export async function getAvailableReturnQuantity(
  invoiceId: string,
  itemId: string
): Promise<number> {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: {
        where: { itemId },
      },
      returns: {
        where: { status: { not: 'cancelled' } },
        include: {
          lines: {
            where: { itemId },
          },
        },
      },
    },
  });

  if (!invoice || invoice.lines.length === 0) {
    return 0;
  }

  const originalQty = decimalToNumber(invoice.lines[0].qty);
  const returnedQty = invoice.returns.reduce((sum, ret) => {
    return sum + ret.lines.reduce((lineSum, line) => {
      return lineSum + decimalToNumber(line.qty);
    }, 0);
  }, 0);

  return originalQty - returnedQty;
}
