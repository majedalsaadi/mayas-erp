/**
 * Mayas ERP - POS Terminal Service
 * خدمة محطات نقاط البيع
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لمحطات POS:
 * - إدارة المحطات
 * - إنشاء فاتورة POS سريعة
 * - البحث عن الأصناف
 * - العمليات السريعة
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import { createSalesInvoice, getSalesInvoice } from '../sales/invoices';
import type {
  POSTerminal,
  POSShiftWithRelations,
  CreateSalesInvoiceRequest,
  CreateSalesInvoiceLineInput,
  SalesInvoiceWithRelations,
  InvoiceType,
  PaymentMethod,
} from '@/types/sales';

// ============================================
// الأخطاء المخصصة
// ============================================

/**
 * خطأ المحطة غير موجودة
 */
export class TerminalNotFoundError extends Error {
  constructor(identifier: string) {
    super(`المحطة غير موجودة: ${identifier}`);
    this.name = 'TerminalNotFoundError';
  }
}

/**
 * خطأ المحطة غير نشطة
 */
export class TerminalInactiveError extends Error {
  constructor(terminalId: string) {
    super(`المحطة غير نشطة: ${terminalId}`);
    this.name = 'TerminalInactiveError';
  }
}

/**
 * خطأ عدم وجود وردية مفتوحة
 */
export class NoOpenShiftError extends Error {
  constructor(terminalId: string) {
    super(`لا توجد وردية مفتوحة للمحطة: ${terminalId}`);
    this.name = 'NoOpenShiftError';
  }
}

/**
 * خطأ وجود وردية مفتوحة مسبقاً
 */
export class ShiftAlreadyOpenError extends Error {
  constructor(terminalId: string) {
    super(`يوجد وردية مفتوحة مسبقاً للمحطة: ${terminalId}`);
    this.name = 'ShiftAlreadyOpenError';
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
 * تحويل بيانات المحطة من Prisma
 */
function transformTerminal(terminal: any): POSTerminal {
  return {
    ...terminal,
  };
}

// ============================================
// إدارة المحطات
// ============================================

/**
 * إنشاء محطة POS جديدة
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات المحطة
 * @returns المحطة المُنشأة
 */
export async function createPOSTerminal(
  companyId: string,
  data: {
    branchId: string;
    warehouseId: string;
    cashboxId: string;
    code: string;
    nameAr: string;
    nameEn: string;
    receiptPrinter?: string;
    barcodeScanner?: string;
  }
): Promise<POSTerminal> {
  // التحقق من عدم تكرار الكود في الفرع
  const existing = await prisma.pOSTerminal.findFirst({
    where: {
      branchId: data.branchId,
      code: data.code,
    },
  });

  if (existing) {
    throw new Error(`كود المحطة موجود مسبقاً في هذا الفرع: ${data.code}`);
  }

  const terminal = await prisma.pOSTerminal.create({
    data: {
      companyId,
      branchId: data.branchId,
      warehouseId: data.warehouseId,
      cashboxId: data.cashboxId,
      code: data.code,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      receiptPrinter: data.receiptPrinter,
      barcodeScanner: data.barcodeScanner,
      isActive: true,
    },
  });

  return transformTerminal(terminal);
}

/**
 * تحديث محطة POS
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @param data - بيانات التحديث
 * @returns المحطة المُحدثة
 */
export async function updatePOSTerminal(
  companyId: string,
  terminalId: string,
  data: Partial<{
    code: string;
    nameAr: string;
    nameEn: string;
    warehouseId: string;
    cashboxId: string;
    receiptPrinter: string;
    barcodeScanner: string;
    isActive: boolean;
  }>
): Promise<POSTerminal> {
  const terminal = await prisma.pOSTerminal.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
  });

  if (!terminal) {
    throw new TerminalNotFoundError(terminalId);
  }

  const updated = await prisma.pOSTerminal.update({
    where: { id: terminalId },
    data,
  });

  return transformTerminal(updated);
}

/**
 * جلب محطة POS واحدة
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @returns المحطة المطلوبة
 */
export async function getPOSTerminal(
  companyId: string,
  terminalId: string
): Promise<POSTerminal> {
  const terminal = await prisma.pOSTerminal.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
  });

  if (!terminal) {
    throw new TerminalNotFoundError(terminalId);
  }

  return transformTerminal(terminal);
}

/**
 * جلب محطة POS بالكود
 * 
 * @param branchId - معرف الفرع
 * @param code - كود المحطة
 * @returns المحطة المطلوبة
 */
export async function getPOSTerminalByCode(
  branchId: string,
  code: string
): Promise<POSTerminal> {
  const terminal = await prisma.pOSTerminal.findFirst({
    where: {
      branchId,
      code,
    },
  });

  if (!terminal) {
    throw new TerminalNotFoundError(code);
  }

  return transformTerminal(terminal);
}

/**
 * قائمة محطات POS
 * 
 * @param companyId - معرف الشركة
 * @param branchId - معرف الفرع (اختياري)
 * @param activeOnly - جلب المحطات النشطة فقط
 * @returns قائمة المحطات
 */
export async function listPOSTerminals(
  companyId: string,
  branchId?: string,
  activeOnly: boolean = true
): Promise<POSTerminal[]> {
  const terminals = await prisma.pOSTerminal.findMany({
    where: {
      companyId,
      branchId,
      isActive: activeOnly ? true : undefined,
    },
    orderBy: {
      code: 'asc',
    },
  });

  return terminals.map(transformTerminal);
}

/**
 * جلب المحطة مع الوردية الحالية
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @returns المحطة مع الوردية الحالية
 */
export async function getTerminalWithCurrentShift(
  companyId: string,
  terminalId: string
): Promise<{
  terminal: POSTerminal;
  currentShift: POSShiftWithRelations | null;
}> {
  const terminal = await getPOSTerminal(companyId, terminalId);

  const currentShift = await prisma.pOSShift.findFirst({
    where: {
      terminalId,
      status: 'open',
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return {
    terminal,
    currentShift: currentShift
      ? {
          ...currentShift,
          openingCash: decimalToNumber(currentShift.openingCash),
          expectedCash: currentShift.expectedCash ? decimalToNumber(currentShift.expectedCash) : null,
          actualCash: currentShift.actualCash ? decimalToNumber(currentShift.actualCash) : null,
          cashDifference: currentShift.cashDifference
            ? decimalToNumber(currentShift.cashDifference)
            : null,
        }
      : null,
  };
}

// ============================================
// العمليات السريعة
// ============================================

/**
 * البحث السريع عن صنف للـ POS
 * 
 * @param companyId - معرف الشركة
 * @param warehouseId - معرف المستودع
 * @param query - نص البحث (كود، اسم، باركود)
 * @param limit - عدد النتائج
 * @returns قائمة الأصناف مع الأسعار والمخزون
 */
export async function quickSearchItems(
  companyId: string,
  warehouseId: string,
  query: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    barcode?: string;
    price: number;
    stock: number;
    unitId: string;
    unitName: string;
  }>
> {
  // البحث في الباركودات أولاً
  const barcodeMatch = await prisma.itemBarcode.findFirst({
    where: {
      barcode: query,
    },
    include: {
      item: {
        include: {
          unit: true,
          prices: {
            where: { isActive: true },
            take: 1,
          },
          stockBalances: {
            where: { warehouseId },
          },
        },
      },
    },
  });

  if (barcodeMatch) {
    const item = barcodeMatch.item;
    return [
      {
        id: item.id,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        barcode: barcodeMatch.barcode,
        price: item.prices[0] ? decimalToNumber(item.prices[0].price) : 0,
        stock: item.stockBalances[0] ? decimalToNumber(item.stockBalances[0].qtyAvailable) : 0,
        unitId: item.unitId,
        unitName: item.unit?.nameAr || '',
      },
    ];
  }

  // البحث في الأصناف
  const items = await prisma.item.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { nameAr: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
        { partNumber: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      unit: true,
      barcodes: {
        where: { isPrimary: true },
        take: 1,
      },
      prices: {
        where: { isActive: true },
        take: 1,
      },
      stockBalances: {
        where: { warehouseId },
      },
    },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    barcode: item.barcodes[0]?.barcode,
    price: item.prices[0] ? decimalToNumber(item.prices[0].price) : 0,
    stock: item.stockBalances[0] ? decimalToNumber(item.stockBalances[0].qtyAvailable) : 0,
    unitId: item.unitId,
    unitName: item.unit?.nameAr || '',
  }));
}

/**
 * إنشاء فاتورة POS سريعة
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @param userId - معرف المستخدم (الكاشير)
 * @param items - قائمة الأصناف
 * @param paymentMethod - طريقة الدفع
 * @param customerId - معرف العميل (اختياري، افتراضياً عميل نقدي)
 * @returns الفاتورة المُنشأة
 */
export async function createQuickInvoice(
  companyId: string,
  terminalId: string,
  userId: string,
  items: Array<{
    itemId: string;
    qty: number;
    unitPrice?: number;
    discountPercent?: number;
  }>,
  paymentMethod: PaymentMethod,
  customerId?: string
): Promise<SalesInvoiceWithRelations> {
  // جلب المحطة
  const terminal = await prisma.pOSTerminal.findFirst({
    where: {
      id: terminalId,
      companyId,
    },
  });

  if (!terminal) {
    throw new TerminalNotFoundError(terminalId);
  }

  if (!terminal.isActive) {
    throw new TerminalInactiveError(terminalId);
  }

  // التحقق من وجود وردية مفتوحة
  const openShift = await prisma.pOSShift.findFirst({
    where: {
      terminalId,
      status: 'open',
    },
  });

  if (!openShift) {
    throw new NoOpenShiftError(terminalId);
  }

  // تحديد العميل (افتراضياً عميل نقدي)
  let finalCustomerId = customerId;
  if (!finalCustomerId) {
    // البحث عن عميل نقدي افتراضي
    let cashCustomer = await prisma.customer.findFirst({
      where: {
        companyId,
        customerType: 'retail',
        code: 'CASH',
      },
    });

    if (!cashCustomer) {
      // إنشاء عميل نقدي افتراضي
      cashCustomer = await prisma.customer.create({
        data: {
          companyId,
          code: 'CASH',
          nameAr: 'عميل نقدي',
          nameEn: 'Cash Customer',
          customerType: 'retail',
          isActive: true,
        },
      });
    }

    finalCustomerId = cashCustomer.id;
  }

  // تحضير بنود الفاتورة
  const lines: CreateSalesInvoiceLineInput[] = items.map((item) => ({
    itemId: item.itemId,
    qty: item.qty,
    unitId: '', // سيتم تحديده من الصنف
    unitPrice: item.unitPrice,
    discountPercent: item.discountPercent,
  }));

  // جلب وحدات الأصناف
  for (const line of lines) {
    const item = await prisma.item.findUnique({
      where: { id: line.itemId },
      select: { unitId: true },
    });
    if (item) {
      line.unitId = item.unitId;
    }
  }

  // إنشاء الفاتورة
  const invoiceData: CreateSalesInvoiceRequest = {
    branchId: terminal.branchId,
    warehouseId: terminal.warehouseId,
    customerId: finalCustomerId,
    posTerminalId: terminalId,
    invoiceType: paymentMethod === 'cash' ? 'cash' : 'credit',
    invoiceSubtype: 'simplified',
    paymentMethod,
    lines,
    payments: [], // سيتم إضافتها لاحقاً
  };

  // إنشاء الفاتورة
  const invoice = await createSalesInvoice(companyId, invoiceData, userId);

  // إضافة حركة للوردية
  await prisma.pOSShiftMovement.create({
    data: {
      shiftId: openShift.id,
      movementType: 'sale',
      amount: toDecimal(invoice.totalAmount),
      referenceType: 'sales_invoice',
      referenceId: invoice.id,
    },
  });

  return invoice;
}

/**
 * إنشاء فاتورة مرتجع سريعة من POS
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @param userId - معرف المستخدم
 * @param originalInvoiceId - معرف الفاتورة الأصلية
 * @param items - قائمة الأصناف المرتجعة
 * @returns المرتجع المُنشأ
 */
export async function createQuickReturn(
  companyId: string,
  terminalId: string,
  userId: string,
  originalInvoiceId: string,
  items: Array<{
    itemId: string;
    qty: number;
    reason?: string;
  }>
): Promise<any> {
  // التحقق من المحطة والوردية
  const { terminal, currentShift } = await getTerminalWithCurrentShift(companyId, terminalId);

  if (!currentShift) {
    throw new NoOpenShiftError(terminalId);
  }

  // جلب الفاتورة الأصلية
  const originalInvoice = await getSalesInvoice(companyId, originalInvoiceId);

  // تحضير بنود المرتجع
  const returnLines = items.map((item) => {
    const originalLine = originalInvoice.lines?.find((l) => l.itemId === item.itemId);
    if (!originalLine) {
      throw new Error(`الصنف ${item.itemId} غير موجود في الفاتورة الأصلية`);
    }

    return {
      itemId: item.itemId,
      qty: item.qty,
      unitId: originalLine.unitId,
      unitPrice: originalLine.unitPrice,
      returnReason: item.reason as any,
    };
  });

  // إنشاء المرتجع
  const { createSalesReturn } = await import('../sales/returns');
  const salesReturn = await createSalesReturn(
    companyId,
    {
      branchId: terminal.branchId,
      warehouseId: terminal.warehouseId,
      customerId: originalInvoice.customerId,
      originalInvoiceId,
      refundMethod: 'cash',
      lines: returnLines,
    },
    userId
  );

  // تأكيد المرتجع
  const { confirmSalesReturn } = await import('../sales/returns');
  const confirmedReturn = await confirmSalesReturn(companyId, salesReturn.id, userId);

  // إضافة حركة للوردية
  await prisma.pOSShiftMovement.create({
    data: {
      shiftId: currentShift.id,
      movementType: 'refund',
      amount: toDecimal(-confirmedReturn.totalAmount),
      referenceType: 'sales_return',
      referenceId: confirmedReturn.id,
    },
  });

  return confirmedReturn;
}

/**
 * تعليق فاتورة (حفظ مؤقت)
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @param items - قائمة الأصناف
 * @param notes - ملاحظات
 * @returns معرف الفاتورة المعلقة
 */
export async function suspendInvoice(
  companyId: string,
  terminalId: string,
  items: Array<{
    itemId: string;
    qty: number;
    unitPrice?: number;
  }>,
  notes?: string
): Promise<string> {
  // حفظ الفاتورة المعلقة في جدول منفصل أو في الذاكرة المؤقتة
  // هذا مثال مبسط - يمكن تطويره لاحقاً
  
  const suspendedInvoice = await prisma.suspendedInvoice.create({
    data: {
      companyId,
      terminalId,
      items: JSON.stringify(items),
      notes,
      suspendedAt: new Date(),
    },
  });

  return suspendedInvoice.id;
}

/**
 * استرجاع فاتورة معلقة
 * 
 * @param companyId - معرف الشركة
 * @param suspendedId - معرف الفاتورة المعلقة
 * @returns بيانات الفاتورة المعلقة
 */
export async function retrieveSuspendedInvoice(
  companyId: string,
  suspendedId: string
): Promise<{
  items: Array<{
    itemId: string;
    qty: number;
    unitPrice?: number;
  }>;
  notes?: string;
}> {
  const suspended = await prisma.suspendedInvoice.findFirst({
    where: {
      id: suspendedId,
      companyId,
    },
  });

  if (!suspended) {
    throw new Error('الفاتورة المعلقة غير موجودة');
  }

  return {
    items: JSON.parse(suspended.items),
    notes: suspended.notes || undefined,
  };
}

/**
 * جلب الفواتير المعلقة
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @returns قائمة الفواتير المعلقة
 */
export async function listSuspendedInvoices(
  companyId: string,
  terminalId: string
): Promise<
  Array<{
    id: string;
    suspendedAt: Date;
    notes?: string;
    itemCount: number;
  }>
> {
  const suspended = await prisma.suspendedInvoice.findMany({
    where: {
      companyId,
      terminalId,
    },
    orderBy: {
      suspendedAt: 'desc',
    },
  });

  return suspended.map((s) => ({
    id: s.id,
    suspendedAt: s.suspendedAt,
    notes: s.notes || undefined,
    itemCount: JSON.parse(s.items).length,
  }));
}

/**
 * حذف فاتورة معلقة
 * 
 * @param companyId - معرف الشركة
 * @param suspendedId - معرف الفاتورة المعلقة
 */
export async function deleteSuspendedInvoice(
  companyId: string,
  suspendedId: string
): Promise<void> {
  await prisma.suspendedInvoice.deleteMany({
    where: {
      id: suspendedId,
      companyId,
    },
  });
}

/**
 * جلب آخر فواتير المحطة
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @param limit - عدد الفواتير
 * @returns قائمة الفواتير
 */
export async function getRecentTerminalInvoices(
  companyId: string,
  terminalId: string,
  limit: number = 10
): Promise<SalesInvoiceWithRelations[]> {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      posTerminalId: terminalId,
    },
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
      createdAt: 'desc',
    },
    take: limit,
  });

  return invoices.map((invoice) => ({
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
  }));
}
