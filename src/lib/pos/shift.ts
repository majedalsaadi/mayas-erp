/**
 * Mayas ERP - POS Shift Service
 * خدمة ورديات نقاط البيع
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لورديات POS:
 * - فتح وردية
 * - إغلاق وردية
 * - إدارة حركات الصندوق
 * - تقارير الورديات
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  POSShift,
  POSShiftWithRelations,
  POSShiftMovement,
  OpenShiftRequest,
  CloseShiftRequest,
  AddShiftMovementRequest,
  ShiftStatus,
  MovementType,
  POSSummary,
} from '@/types/sales';

// ============================================
// الأخطاء المخصصة
// ============================================

/**
 * خطأ الوردية غير موجودة
 */
export class ShiftNotFoundError extends Error {
  constructor(identifier: string) {
    super(`الوردية غير موجودة: ${identifier}`);
    this.name = 'ShiftNotFoundError';
  }
}

/**
 * خطأ وردية مغلقة
 */
export class ShiftClosedError extends Error {
  constructor(shiftId: string) {
    super(`الوردية مغلقة: ${shiftId}`);
    this.name = 'ShiftClosedError';
  }
}

/**
 * خطأ وردية مفتوحة مسبقاً
 */
export class ShiftAlreadyOpenError extends Error {
  constructor(terminalId: string) {
    super(`يوجد وردية مفتوحة مسبقاً للمحطة: ${terminalId}`);
    this.name = 'ShiftAlreadyOpenError';
  }
}

/**
 * خطأ في مبلغ الإغلاق
 */
export class InvalidClosingAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidClosingAmountError';
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
 * توليد رقم وردية تسلسلي
 */
async function generateShiftNumber(terminalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // جلب آخر رقم وردية للمحطة
  const lastShift = await prisma.pOSShift.findFirst({
    where: {
      terminalId,
      shiftNo: {
        startsWith: `SH-${year}${month}-`,
      },
    },
    orderBy: {
      shiftNo: 'desc',
    },
    select: {
      shiftNo: true,
    },
  });

  let sequence = 1;
  if (lastShift) {
    const parts = lastShift.shiftNo.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }

  return `SH-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

/**
 * تحويل بيانات الوردية من Prisma
 */
function transformShift(shift: any): POSShiftWithRelations {
  return {
    ...shift,
    openingCash: decimalToNumber(shift.openingCash),
    expectedCash: shift.expectedCash ? decimalToNumber(shift.expectedCash) : null,
    actualCash: shift.actualCash ? decimalToNumber(shift.actualCash) : null,
    cashDifference: shift.cashDifference ? decimalToNumber(shift.cashDifference) : null,
    movements: shift.movements?.map((m: any) => ({
      ...m,
      amount: decimalToNumber(m.amount),
    })),
  };
}

/**
 * حساب المتوقع في الصندوق
 */
async function calculateExpectedCash(shiftId: string): Promise<number> {
  const movements = await prisma.pOSShiftMovement.findMany({
    where: { shiftId },
  });

  let total = 0;
  for (const movement of movements) {
    const amount = decimalToNumber(movement.amount);
    switch (movement.movementType) {
      case 'open':
      case 'sale':
      case 'cash_in':
        total += amount;
        break;
      case 'refund':
      case 'cash_out':
      case 'close':
        total -= amount;
        break;
    }
  }

  return total;
}

// ============================================
// العمليات الأساسية
// ============================================

/**
 * فتح وردية جديدة
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات فتح الوردية
 * @returns الوردية المُفتوحة
 */
export async function openShift(
  companyId: string,
  data: OpenShiftRequest
): Promise<POSShiftWithRelations> {
  // التحقق من عدم وجود وردية مفتوحة للمحطة
  const openShift = await prisma.pOSShift.findFirst({
    where: {
      terminalId: data.terminalId,
      status: 'open',
    },
  });

  if (openShift) {
    throw new ShiftAlreadyOpenError(data.terminalId);
  }

  // التحقق من المحطة
  const terminal = await prisma.pOSTerminal.findFirst({
    where: {
      id: data.terminalId,
      companyId,
      isActive: true,
    },
  });

  if (!terminal) {
    throw new Error('المحطة غير موجودة أو غير نشطة');
  }

  // توليد رقم الوردية
  const shiftNo = await generateShiftNumber(data.terminalId);

  // إنشاء الوردية مع حركة الفتح
  const shift = await prisma.pOSShift.create({
    data: {
      terminalId: data.terminalId,
      userId: data.userId,
      shiftNo,
      openedAt: new Date(),
      openingCash: toDecimal(data.openingCash),
      status: 'open',
      notes: data.notes,
      movements: {
        create: {
          movementType: 'open',
          amount: toDecimal(data.openingCash),
          notes: 'رصيد افتتاحي',
        },
      },
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return transformShift(shift);
}

/**
 * إغلاق وردية
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات إغلاق الوردية
 * @returns الوردية المُغلقة
 */
export async function closeShift(
  companyId: string,
  data: CloseShiftRequest
): Promise<POSShiftWithRelations> {
  // جلب الوردية
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: data.shiftId,
      status: 'open',
    },
    include: {
      terminal: {
        include: {
          company: true,
        },
      },
      movements: true,
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(data.shiftId);
  }

  if (shift.terminal.companyId !== companyId) {
    throw new ShiftNotFoundError(data.shiftId);
  }

  // حساب المتوقع في الصندوق
  const expectedCash = await calculateExpectedCash(data.shiftId);

  // حساب الفرق
  const difference = data.actualCash - expectedCash;

  // إضافة حركة الإغلاق وتحديث الوردية
  const updated = await prisma.pOSShift.update({
    where: { id: data.shiftId },
    data: {
      closedAt: new Date(),
      expectedCash: toDecimal(expectedCash),
      actualCash: toDecimal(data.actualCash),
      cashDifference: toDecimal(difference),
      status: 'closed',
      notes: data.notes ? `${shift.notes || ''}\n${data.notes}` : shift.notes,
      movements: {
        create: {
          movementType: 'close',
          amount: toDecimal(data.actualCash),
          notes: `إغلاق الوردية - الفرق: ${difference.toFixed(2)}`,
        },
      },
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return transformShift(updated);
}

/**
 * تعليق وردية (إيقاف مؤقت)
 * 
 * @param companyId - معرف الشركة
 * @param shiftId - معرف الوردية
 * @param notes - ملاحظات
 * @returns الوردية المُعلقة
 */
export async function suspendShift(
  companyId: string,
  shiftId: string,
  notes?: string
): Promise<POSShiftWithRelations> {
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: shiftId,
      status: 'open',
    },
    include: {
      terminal: true,
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(shiftId);
  }

  if (shift.terminal.companyId !== companyId) {
    throw new ShiftNotFoundError(shiftId);
  }

  const updated = await prisma.pOSShift.update({
    where: { id: shiftId },
    data: {
      status: 'suspended',
      notes: notes ? `${shift.notes || ''}\n${notes}` : shift.notes,
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return transformShift(updated);
}

/**
 * استئناف وردية معلقة
 * 
 * @param companyId - معرف الشركة
 * @param shiftId - معرف الوردية
 * @returns الوردية المستأنفة
 */
export async function resumeShift(
  companyId: string,
  shiftId: string
): Promise<POSShiftWithRelations> {
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: shiftId,
      status: 'suspended',
    },
    include: {
      terminal: true,
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(shiftId);
  }

  if (shift.terminal.companyId !== companyId) {
    throw new ShiftNotFoundError(shiftId);
  }

  const updated = await prisma.pOSShift.update({
    where: { id: shiftId },
    data: {
      status: 'open',
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return transformShift(updated);
}

/**
 * إضافة حركة صندوق (إيداع/سحب)
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات الحركة
 * @returns الحركة المُضافة
 */
export async function addShiftMovement(
  companyId: string,
  data: AddShiftMovementRequest
): Promise<POSShiftMovement> {
  // التحقق من الوردية
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: data.shiftId,
      status: 'open',
    },
    include: {
      terminal: true,
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(data.shiftId);
  }

  if (shift.terminal.companyId !== companyId) {
    throw new ShiftNotFoundError(data.shiftId);
  }

  // إنشاء الحركة
  const movement = await prisma.pOSShiftMovement.create({
    data: {
      shiftId: data.shiftId,
      movementType: data.movementType,
      amount: toDecimal(data.amount),
      notes: data.notes,
    },
  });

  return {
    ...movement,
    amount: decimalToNumber(movement.amount),
  };
}

/**
 * جلب وردية واحدة
 * 
 * @param companyId - معرف الشركة
 * @param shiftId - معرف الوردية
 * @returns الوردية المطلوبة
 */
export async function getShift(
  companyId: string,
  shiftId: string
): Promise<POSShiftWithRelations> {
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: shiftId,
      terminal: {
        companyId,
      },
    },
    include: {
      terminal: true,
      movements: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(shiftId);
  }

  return transformShift(shift);
}

/**
 * جلب الوردية الحالية للمحطة
 * 
 * @param companyId - معرف الشركة
 * @param terminalId - معرف المحطة
 * @returns الوردية الحالية أو null
 */
export async function getCurrentShift(
  companyId: string,
  terminalId: string
): Promise<POSShiftWithRelations | null> {
  const shift = await prisma.pOSShift.findFirst({
    where: {
      terminalId,
      status: 'open',
      terminal: {
        companyId,
      },
    },
    include: {
      terminal: true,
      movements: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  return shift ? transformShift(shift) : null;
}

/**
 * قائمة الورديات
 * 
 * @param companyId - معرف الشركة
 * @param filters - معايير الفلترة
 * @param page - رقم الصفحة
 * @param pageSize - حجم الصفحة
 * @returns قائمة الورديات
 */
export async function listShifts(
  companyId: string,
  filters?: {
    terminalId?: string;
    userId?: string;
    status?: ShiftStatus;
    dateFrom?: Date;
    dateTo?: Date;
  },
  page: number = 1,
  pageSize: number = 20
): Promise<{
  shifts: POSShiftWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const where: Prisma.POSShiftWhereInput = {
    terminal: {
      companyId,
    },
  };

  if (filters) {
    if (filters.terminalId) where.terminalId = filters.terminalId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    if (filters.dateFrom || filters.dateTo) {
      where.openedAt = {};
      if (filters.dateFrom) where.openedAt.gte = filters.dateFrom;
      if (filters.dateTo) where.openedAt.lte = filters.dateTo;
    }
  }

  const total = await prisma.pOSShift.count({ where });

  const shifts = await prisma.pOSShift.findMany({
    where,
    include: {
      terminal: true,
      movements: true,
    },
    orderBy: {
      openedAt: 'desc',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    shifts: shifts.map(transformShift),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * ملخص الوردية
 * 
 * @param companyId - معرف الشركة
 * @param shiftId - معرف الوردية
 * @returns ملخص الوردية
 */
export async function getShiftSummary(
  companyId: string,
  shiftId: string
): Promise<POSSummary> {
  const shift = await getShift(companyId, shiftId);

  // حساب الإحصائيات
  let totalSales = 0;
  let totalRefunds = 0;
  let totalCashIn = 0;
  let totalCashOut = 0;
  const paymentsByMethod: Record<string, number> = {};

  for (const movement of shift.movements || []) {
    switch (movement.movementType) {
      case 'sale':
        totalSales += movement.amount;
        break;
      case 'refund':
        totalRefunds += Math.abs(movement.amount);
        break;
      case 'cash_in':
        totalCashIn += movement.amount;
        break;
      case 'cash_out':
        totalCashOut += movement.amount;
        break;
    }
  }

  // جلب الفواتير للحساب حسب طريقة الدفع
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      posTerminalId: shift.terminalId,
      createdAt: {
        gte: shift.openedAt,
        lte: shift.closedAt || new Date(),
      },
    },
    include: {
      payments: true,
    },
  });

  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const method = payment.paymentMethod;
      const amount = decimalToNumber(payment.amount);
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + amount;
    }
  }

  return {
    shiftId: shift.id,
    terminalName: shift.terminal?.nameAr || '',
    openedAt: shift.openedAt,
    totalSales,
    totalRefunds,
    totalCashIn,
    totalCashOut,
    transactionCount: (shift.movements || []).filter(
      (m) => m.movementType === 'sale' || m.movementType === 'refund'
    ).length,
    paymentsByMethod: paymentsByMethod as any,
  };
}

/**
 * تقرير ورديات الفترة
 * 
 * @param companyId - معرف الشركة
 * @param branchId - معرف الفرع (اختياري)
 * @param dateFrom - من تاريخ
 * @param dateTo - إلى تاريخ
 * @returns تقرير الورديات
 */
export async function getShiftsReport(
  companyId: string,
  branchId?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalShifts: number;
  totalSales: number;
  totalRefunds: number;
  totalCashIn: number;
  totalCashOut: number;
  totalDifference: number;
  byTerminal: Array<{
    terminalId: string;
    terminalName: string;
    shiftsCount: number;
    totalSales: number;
    totalRefunds: number;
    avgDifference: number;
  }>;
}> {
  const where: Prisma.POSShiftWhereInput = {
    terminal: {
      companyId,
      branchId,
    },
    status: 'closed',
  };

  if (dateFrom || dateTo) {
    where.openedAt = {};
    if (dateFrom) where.openedAt.gte = dateFrom;
    if (dateTo) where.openedAt.lte = dateTo;
  }

  const shifts = await prisma.pOSShift.findMany({
    where,
    include: {
      terminal: true,
      movements: true,
    },
  });

  let totalSales = 0;
  let totalRefunds = 0;
  let totalCashIn = 0;
  let totalCashOut = 0;
  let totalDifference = 0;

  const byTerminalMap: Record<
    string,
    {
      terminalId: string;
      terminalName: string;
      shiftsCount: number;
      totalSales: number;
      totalRefunds: number;
      totalDifference: number;
    }
  > = {};

  for (const shift of shifts) {
    const diff = decimalToNumber(shift.cashDifference) || 0;
    totalDifference += diff;

    for (const movement of shift.movements) {
      const amount = decimalToNumber(movement.amount);
      switch (movement.movementType) {
        case 'sale':
          totalSales += amount;
          break;
        case 'refund':
          totalRefunds += Math.abs(amount);
          break;
        case 'cash_in':
          totalCashIn += amount;
          break;
        case 'cash_out':
          totalCashOut += amount;
          break;
      }
    }

    // تجميع حسب المحطة
    const terminalId = shift.terminalId;
    if (!byTerminalMap[terminalId]) {
      byTerminalMap[terminalId] = {
        terminalId,
        terminalName: shift.terminal?.nameAr || '',
        shiftsCount: 0,
        totalSales: 0,
        totalRefunds: 0,
        totalDifference: 0,
      };
    }
    byTerminalMap[terminalId].shiftsCount += 1;
    byTerminalMap[terminalId].totalDifference += diff;

    for (const movement of shift.movements) {
      const amount = decimalToNumber(movement.amount);
      if (movement.movementType === 'sale') {
        byTerminalMap[terminalId].totalSales += amount;
      } else if (movement.movementType === 'refund') {
        byTerminalMap[terminalId].totalRefunds += Math.abs(amount);
      }
    }
  }

  const byTerminal = Object.values(byTerminalMap).map((t) => ({
    ...t,
    avgDifference: t.shiftsCount > 0 ? t.totalDifference / t.shiftsCount : 0,
  }));

  return {
    totalShifts: shifts.length,
    totalSales,
    totalRefunds,
    totalCashIn,
    totalCashOut,
    totalDifference,
    byTerminal,
  };
}

/**
 * جلب حركات الوردية
 * 
 * @param companyId - معرف الشركة
 * @param shiftId - معرف الوردية
 * @param filters - معايير الفلترة
 * @returns قائمة الحركات
 */
export async function getShiftMovements(
  companyId: string,
  shiftId: string,
  filters?: {
    movementType?: MovementType;
  }
): Promise<POSShiftMovement[]> {
  // التحقق من الوردية
  const shift = await prisma.pOSShift.findFirst({
    where: {
      id: shiftId,
      terminal: {
        companyId,
      },
    },
  });

  if (!shift) {
    throw new ShiftNotFoundError(shiftId);
  }

  const where: Prisma.POSShiftMovementWhereInput = {
    shiftId,
  };

  if (filters?.movementType) {
    where.movementType = filters.movementType;
  }

  const movements = await prisma.pOSShiftMovement.findMany({
    where,
    orderBy: {
      createdAt: 'asc',
    },
  });

  return movements.map((m) => ({
    ...m,
    amount: decimalToNumber(m.amount),
  }));
}

/**
 * التحقق من وجود وردية مفتوحة للمستخدم
 * 
 * @param companyId - معرف الشركة
 * @param userId - معرف المستخدم
 * @returns الوردية المفتوحة أو null
 */
export async function getUserOpenShift(
  companyId: string,
  userId: string
): Promise<POSShiftWithRelations | null> {
  const shift = await prisma.pOSShift.findFirst({
    where: {
      userId,
      status: 'open',
      terminal: {
        companyId,
      },
    },
    include: {
      terminal: true,
      movements: true,
    },
  });

  return shift ? transformShift(shift) : null;
}
