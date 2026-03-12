/**
 * Mayas ERP - Purchase Returns Service
 * خدمة مردودات الشراء
 */

import prisma from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PurchaseReturn,
  PurchaseReturnWithRelations,
  PurchaseReturnLine,
  PurchaseReturnLineWithItem,
  CreatePurchaseReturnRequest,
  UpdatePurchaseReturnRequest,
  PurchaseReturnSearchFilters,
  ListPurchasingQuery,
  PurchaseReturnStatus,
  PostReturnResult,
} from '@/types/purchasing';
import { Prisma } from '@prisma/client';

const logger = createLogger('PurchaseReturnsService');

// ============================================
// دوال مساعدة
// ============================================

/**
 * تحويل Decimal إلى رقم
 */
function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

/**
 * تحويل رقم إلى Decimal
 */
function toDecimal(value: number): Decimal {
  return new Decimal(value);
}

/**
 * توليد رقم مردود الشراء التالي
 */
async function generatePurchaseReturnNumber(companyId: string): Promise<string> {
  const lastReturn = await prisma.purchaseReturn.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { returnNo: true },
  });

  if (!lastReturn) {
    return 'PR-000001';
  }

  const lastNumber = parseInt(lastReturn.returnNo.replace('PR-', ''), 10);
  const nextNumber = lastNumber + 1;
  return `PR-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * حساب إجماليات مردود الشراء
 */
function calculateReturnTotals(lines: Array<{
  qty: number;
  unitCost: number;
  discountAmount: number;
  taxAmount: number;
}>): { subtotal: number; discountAmount: number; taxAmount: number; totalAmount: number } {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const lineTotal = line.qty * line.unitCost;
    subtotal += lineTotal;
    discountAmount += line.discountAmount || 0;
    taxAmount += line.taxAmount || 0;
  }

  const totalAmount = subtotal - discountAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

// ============================================
// العمليات الأساسية - CRUD
// ============================================

/**
 * إنشاء مردود شراء جديد
 */
export async function createPurchaseReturn(
  companyId: string,
  userId: string,
  data: CreatePurchaseReturnRequest
): Promise<PurchaseReturnWithRelations> {
  try {
    // التحقق من وجود المورد
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, companyId },
    });

    if (!supplier) {
      throw new Error('المورد غير موجود');
    }

    // التحقق من وجود الفرع
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, companyId },
    });

    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    // التحقق من وجود المستودع
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, branchId: data.branchId },
    });

    if (!warehouse) {
      throw new Error('المستودع غير موجود');
    }

    // التحقق من الفاتورة الأصلية (إن وجدت)
    if (data.originalInvoiceId) {
      const originalInvoice = await prisma.purchaseInvoice.findFirst({
        where: { id: data.originalInvoiceId, companyId },
      });

      if (!originalInvoice) {
        throw new Error('الفاتورة الأصلية غير موجودة');
      }

      if (originalInvoice.supplierId !== data.supplierId) {
        throw new Error('المورد لا يطابق مورد الفاتورة الأصلية');
      }
    }

    // التحقق من أمر الشراء (إن وجد)
    if (data.purchaseOrderId) {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, companyId },
      });

      if (!purchaseOrder) {
        throw new Error('أمر الشراء غير موجود');
      }
    }

    // التحقق من الأصناف
    const itemIds = data.lines.map(line => line.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds }, companyId },
    });

    if (items.length !== itemIds.length) {
      throw new Error('بعض الأصناف غير موجودة');
    }

    // توليد رقم المردود
    const returnNo = await generatePurchaseReturnNumber(companyId);

    // حساب الضرائب والكميات الأساسية للبنود
    const linesWithCalculated = await Promise.all(
      data.lines.map(async (line) => {
        // الحصول على معامل التحويل
        let unitFactor = line.unitFactor || 1;
        const item = items.find(i => i.id === line.itemId);
        
        if (item && item.purchaseUnitId === line.unitId) {
          unitFactor = toNumber(item.purchaseToBaseFactor);
        }

        const baseQty = line.qty * unitFactor;

        // حساب الضريبة
        let taxAmount = 0;
        if (line.taxCodeId) {
          const taxCode = await prisma.taxCode.findUnique({
            where: { id: line.taxCodeId },
          });

          if (taxCode) {
            const lineTotal = line.qty * line.unitCost - (line.discountAmount || 0);
            taxAmount = lineTotal * toNumber(taxCode.rate) / 100;
          }
        }

        return {
          ...line,
          unitFactor,
          baseQty,
          taxAmount,
        };
      })
    );

    // حساب الإجماليات
    const totals = calculateReturnTotals(linesWithCalculated);

    // إنشاء مردود الشراء مع البنود
    const purchaseReturn = await prisma.purchaseReturn.create({
      data: {
        companyId,
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        returnNo,
        returnDate: data.returnDate || new Date(),
        supplierId: data.supplierId,
        originalInvoiceId: data.originalInvoiceId,
        purchaseOrderId: data.purchaseOrderId,
        subtotal: toDecimal(totals.subtotal),
        discountAmount: toDecimal(totals.discountAmount),
        taxAmount: toDecimal(totals.taxAmount),
        totalAmount: toDecimal(totals.totalAmount),
        status: 'draft',
        notes: data.notes,
        createdById: userId,
        lines: {
          create: linesWithCalculated.map(line => ({
            itemId: line.itemId,
            originalLineId: line.originalLineId,
            qty: toDecimal(line.qty),
            unitId: line.unitId,
            unitFactor: toDecimal(line.unitFactor),
            baseQty: toDecimal(line.baseQty),
            unitCost: toDecimal(line.unitCost),
            discountAmount: toDecimal(line.discountAmount || 0),
            taxCodeId: line.taxCodeId,
            taxAmount: toDecimal(line.taxAmount),
            lineTotal: toDecimal(line.qty * line.unitCost - (line.discountAmount || 0) + line.taxAmount),
            fromBinId: line.fromBinId,
            returnReason: line.returnReason,
          })),
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            currencyCode: true,
            paymentTermsDays: true,
            currentBalance: true,
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
        originalInvoice: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            totalAmount: true,
            status: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
                partNumber: true,
                unitId: true,
              },
            },
            unit: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });

    logger.info('تم إنشاء مردود شراء جديد', {
      purchaseReturnId: purchaseReturn.id,
      returnNo: purchaseReturn.returnNo,
      supplierId: purchaseReturn.supplierId,
    });

    return {
      ...purchaseReturn,
      subtotal: toNumber(purchaseReturn.subtotal),
      discountAmount: toNumber(purchaseReturn.discountAmount),
      taxAmount: toNumber(purchaseReturn.taxAmount),
      totalAmount: toNumber(purchaseReturn.totalAmount),
      originalInvoice: purchaseReturn.originalInvoice ? {
        ...purchaseReturn.originalInvoice,
        totalAmount: toNumber(purchaseReturn.originalInvoice.totalAmount),
      } : null,
      lines: purchaseReturn.lines.map(line => ({
        ...line,
        qty: toNumber(line.qty),
        unitFactor: toNumber(line.unitFactor),
        baseQty: toNumber(line.baseQty),
        unitCost: toNumber(line.unitCost),
        discountAmount: toNumber(line.discountAmount),
        taxAmount: toNumber(line.taxAmount),
        lineTotal: toNumber(line.lineTotal),
      })),
    };
  } catch (error) {
    logger.error('خطأ في إنشاء مردود الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على مردود شراء بالمعرف
 */
export async function getPurchaseReturnById(
  companyId: string,
  purchaseReturnId: string
): Promise<PurchaseReturnWithRelations | null> {
  try {
    const purchaseReturn = await prisma.purchaseReturn.findFirst({
      where: {
        id: purchaseReturnId,
        companyId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            currencyCode: true,
            paymentTermsDays: true,
            currentBalance: true,
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
        originalInvoice: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            totalAmount: true,
            status: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
                partNumber: true,
                unitId: true,
              },
            },
            unit: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });

    if (!purchaseReturn) {
      return null;
    }

    return {
      ...purchaseReturn,
      subtotal: toNumber(purchaseReturn.subtotal),
      discountAmount: toNumber(purchaseReturn.discountAmount),
      taxAmount: toNumber(purchaseReturn.taxAmount),
      totalAmount: toNumber(purchaseReturn.totalAmount),
      originalInvoice: purchaseReturn.originalInvoice ? {
        ...purchaseReturn.originalInvoice,
        totalAmount: toNumber(purchaseReturn.originalInvoice.totalAmount),
      } : null,
      lines: purchaseReturn.lines.map(line => ({
        ...line,
        qty: toNumber(line.qty),
        unitFactor: toNumber(line.unitFactor),
        baseQty: toNumber(line.baseQty),
        unitCost: toNumber(line.unitCost),
        discountAmount: toNumber(line.discountAmount),
        taxAmount: toNumber(line.taxAmount),
        lineTotal: toNumber(line.lineTotal),
      })),
    };
  } catch (error) {
    logger.error('خطأ في جلب مردود الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على قائمة مردودات الشراء
 */
export async function getPurchaseReturns(
  companyId: string,
  query: ListPurchasingQuery & { filters?: PurchaseReturnSearchFilters }
): Promise<{
  returns: PurchaseReturnWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeSupplier = true,
      includeBranch = true,
      includeWarehouse = true,
      includeLines = false,
      filters,
    } = query;

    const skip = (page - 1) * pageSize;

    // بناء شرط البحث
    const where: Prisma.PurchaseReturnWhereInput = {
      companyId,
      ...(filters?.query && {
        OR: [
          { returnNo: { contains: filters.query, mode: 'insensitive' } },
          { notes: { contains: filters.query, mode: 'insensitive' } },
        ],
      }),
      ...(filters?.supplierId && { supplierId: filters.supplierId }),
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.originalInvoiceId && { originalInvoiceId: filters.originalInvoiceId }),
      ...(filters?.purchaseOrderId && { purchaseOrderId: filters.purchaseOrderId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateRange?.from && {
        returnDate: { gte: filters.dateRange.from },
      }),
      ...(filters?.dateRange?.to && {
        returnDate: { lte: filters.dateRange.to },
      }),
    };

    // تحديد حقل الترتيب
    const orderBy: Prisma.PurchaseReturnOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'date':
        orderBy.returnDate = sortOrder;
        break;
      case 'number':
        orderBy.returnNo = sortOrder;
        break;
      case 'amount':
        orderBy.totalAmount = sortOrder;
        break;
      case 'supplier':
        orderBy.supplier = { nameAr: sortOrder };
        break;
      case 'status':
        orderBy.status = sortOrder;
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder;
        break;
    }

    const [returns, total] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          ...(includeSupplier && {
            supplier: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
                currencyCode: true,
                paymentTermsDays: true,
                currentBalance: true,
              },
            },
          }),
          ...(includeBranch && {
            branch: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
              },
            },
          }),
          ...(includeWarehouse && {
            warehouse: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
              },
            },
          }),
          ...(includeLines && {
            lines: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    nameAr: true,
                    nameEn: true,
                    partNumber: true,
                    unitId: true,
                  },
                },
                unit: {
                  select: {
                    id: true,
                    code: true,
                    nameAr: true,
                    nameEn: true,
                  },
                },
              },
            },
          }),
        },
      }),
      prisma.purchaseReturn.count({ where }),
    ]);

    return {
      returns: returns.map(ret => ({
        ...ret,
        subtotal: toNumber(ret.subtotal),
        discountAmount: toNumber(ret.discountAmount),
        taxAmount: toNumber(ret.taxAmount),
        totalAmount: toNumber(ret.totalAmount),
        lines: ret.lines?.map(line => ({
          ...line,
          qty: toNumber(line.qty),
          unitFactor: toNumber(line.unitFactor),
          baseQty: toNumber(line.baseQty),
          unitCost: toNumber(line.unitCost),
          discountAmount: toNumber(line.discountAmount),
          taxAmount: toNumber(line.taxAmount),
          lineTotal: toNumber(line.lineTotal),
        })),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    logger.error('خطأ في جلب مردودات الشراء', error as Error);
    throw error;
  }
}

/**
 * تحديث مردود شراء
 */
export async function updatePurchaseReturn(
  companyId: string,
  userId: string,
  purchaseReturnId: string,
  data: UpdatePurchaseReturnRequest
): Promise<PurchaseReturnWithRelations> {
  try {
    // التحقق من وجود المردود وحالته
    const existingReturn = await prisma.purchaseReturn.findFirst({
      where: { id: purchaseReturnId, companyId },
    });

    if (!existingReturn) {
      throw new Error('مردود الشراء غير موجود');
    }

    if (existingReturn.status !== 'draft') {
      throw new Error('لا يمكن تعديل مردود الشراء إلا في حالة المسودة');
    }

    // إذا كان هناك تحديث للبنود
    if (data.lines && data.lines.length > 0) {
      // التحقق من الأصناف
      const itemIds = data.lines.map(line => line.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds }, companyId },
      });

      // حذف البنود القديمة
      await prisma.purchaseReturnLine.deleteMany({
        where: { purchaseReturnId },
      });

      // حساب الضرائب والكميات الأساسية للبنود الجديدة
      const linesWithCalculated = await Promise.all(
        data.lines.map(async (line) => {
          // الحصول على معامل التحويل
          let unitFactor = line.unitFactor || 1;
          const item = items.find(i => i.id === line.itemId);
          
          if (item && item.purchaseUnitId === line.unitId) {
            unitFactor = toNumber(item.purchaseToBaseFactor);
          }

          const baseQty = line.qty * unitFactor;

          // حساب الضريبة
          let taxAmount = 0;
          if (line.taxCodeId) {
            const taxCode = await prisma.taxCode.findUnique({
              where: { id: line.taxCodeId },
            });

            if (taxCode) {
              const lineTotal = line.qty * line.unitCost - (line.discountAmount || 0);
              taxAmount = lineTotal * toNumber(taxCode.rate) / 100;
            }
          }

          return {
            ...line,
            unitFactor,
            baseQty,
            taxAmount,
          };
        })
      );

      // حساب الإجماليات الجديدة
      const totals = calculateReturnTotals(linesWithCalculated);

      // إنشاء البنود الجديدة
      await prisma.purchaseReturnLine.createMany({
        data: linesWithCalculated.map(line => ({
          purchaseReturnId,
          itemId: line.itemId,
          originalLineId: line.originalLineId,
          qty: toDecimal(line.qty),
          unitId: line.unitId,
          unitFactor: toDecimal(line.unitFactor),
          baseQty: toDecimal(line.baseQty),
          unitCost: toDecimal(line.unitCost),
          discountAmount: toDecimal(line.discountAmount || 0),
          taxCodeId: line.taxCodeId,
          taxAmount: toDecimal(line.taxAmount),
          lineTotal: toDecimal(line.qty * line.unitCost - (line.discountAmount || 0) + line.taxAmount),
          fromBinId: line.fromBinId,
          returnReason: line.returnReason,
        })),
      });

      // تحديث المردود
      await prisma.purchaseReturn.update({
        where: { id: purchaseReturnId },
        data: {
          supplierId: data.supplierId,
          originalInvoiceId: data.originalInvoiceId,
          purchaseOrderId: data.purchaseOrderId,
          returnDate: data.returnDate,
          notes: data.notes,
          subtotal: toDecimal(totals.subtotal),
          discountAmount: toDecimal(totals.discountAmount),
          taxAmount: toDecimal(totals.taxAmount),
          totalAmount: toDecimal(totals.totalAmount),
        },
      });
    } else {
      // تحديث المردود فقط بدون البنود
      await prisma.purchaseReturn.update({
        where: { id: purchaseReturnId },
        data: {
          supplierId: data.supplierId,
          originalInvoiceId: data.originalInvoiceId,
          purchaseOrderId: data.purchaseOrderId,
          returnDate: data.returnDate,
          notes: data.notes,
        },
      });
    }

    logger.info('تم تحديث مردود الشراء', { purchaseReturnId });

    return (await getPurchaseReturnById(companyId, purchaseReturnId))!;
  } catch (error) {
    logger.error('خطأ في تحديث مردود الشراء', error as Error);
    throw error;
  }
}

/**
 * حذف مردود شراء
 */
export async function deletePurchaseReturn(
  companyId: string,
  purchaseReturnId: string
): Promise<boolean> {
  try {
    // التحقق من وجود المردود وحالته
    const existingReturn = await prisma.purchaseReturn.findFirst({
      where: { id: purchaseReturnId, companyId },
    });

    if (!existingReturn) {
      throw new Error('مردود الشراء غير موجود');
    }

    if (existingReturn.status !== 'draft') {
      throw new Error('لا يمكن حذف مردود الشراء إلا في حالة المسودة');
    }

    // حذف البنود ثم المردود
    await prisma.$transaction([
      prisma.purchaseReturnLine.deleteMany({
        where: { purchaseReturnId },
      }),
      prisma.purchaseReturn.delete({
        where: { id: purchaseReturnId },
      }),
    ]);

    logger.info('تم حذف مردود الشراء', { purchaseReturnId });

    return true;
  } catch (error) {
    logger.error('خطأ في حذف مردود الشراء', error as Error);
    throw error;
  }
}

// ============================================
// العمليات الخاصة بالحالات
// ============================================

/**
 * ترحيل مردود الشراء
 */
export async function postPurchaseReturn(
  companyId: string,
  userId: string,
  purchaseReturnId: string
): Promise<PostReturnResult> {
  try {
    const existingReturn = await prisma.purchaseReturn.findFirst({
      where: { id: purchaseReturnId, companyId },
      include: {
        lines: true,
      },
    });

    if (!existingReturn) {
      throw new Error('مردود الشراء غير موجود');
    }

    if (existingReturn.status !== 'draft') {
      throw new Error('لا يمكن ترحيل مردود الشراء إلا في حالة المسودة');
    }

    // TODO: إنشاء قيد محاسبي عكسي
    // TODO: تحديث أرصدة المخزون (إخراج)
    // TODO: تحديث رصيد المورد

    // تحديث حالة المردود
    const updatedReturn = await prisma.purchaseReturn.update({
      where: { id: purchaseReturnId },
      data: {
        status: 'posted',
      },
    });

    logger.info('تم ترحيل مردود الشراء', { purchaseReturnId });

    return {
      success: true,
      purchaseReturnId,
      previousStatus: 'draft',
      newStatus: 'posted',
      postedAt: new Date(),
      stockUpdated: true,
    };
  } catch (error) {
    logger.error('خطأ في ترحيل مردود الشراء', error as Error);
    throw error;
  }
}

/**
 * إلغاء مردود الشراء
 */
export async function cancelPurchaseReturn(
  companyId: string,
  userId: string,
  purchaseReturnId: string
): Promise<boolean> {
  try {
    const existingReturn = await prisma.purchaseReturn.findFirst({
      where: { id: purchaseReturnId, companyId },
    });

    if (!existingReturn) {
      throw new Error('مردود الشراء غير موجود');
    }

    if (existingReturn.status === 'cancelled') {
      throw new Error('المردود ملغى بالفعل');
    }

    if (!['draft', 'posted'].includes(existingReturn.status)) {
      throw new Error('لا يمكن إلغاء المردود في الحالة الحالية');
    }

    // TODO: عكس القيود المحاسبية إذا كان مرحل
    // TODO: عكس تحديث المخزون إذا كان مرحل

    await prisma.purchaseReturn.update({
      where: { id: purchaseReturnId },
      data: {
        status: 'cancelled',
      },
    });

    logger.info('تم إلغاء مردود الشراء', { purchaseReturnId });

    return true;
  } catch (error) {
    logger.error('خطأ في إلغاء مردود الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على مردودات الشراء حسب المورد
 */
export async function getPurchaseReturnsBySupplier(
  companyId: string,
  supplierId: string
): Promise<PurchaseReturnWithRelations[]> {
  const result = await getPurchaseReturns(companyId, {
    filters: { supplierId },
    pageSize: 1000,
  });

  return result.returns;
}

/**
 * الحصول على مردودات الشراء حسب الفاتورة الأصلية
 */
export async function getPurchaseReturnsByInvoice(
  companyId: string,
  originalInvoiceId: string
): Promise<PurchaseReturnWithRelations[]> {
  const result = await getPurchaseReturns(companyId, {
    filters: { originalInvoiceId },
    pageSize: 1000,
  });

  return result.returns;
}

/**
 * الحصول على إحصائيات مردودات الشراء
 */
export async function getPurchaseReturnStatistics(
  companyId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  total: number;
  byStatus: Record<PurchaseReturnStatus, number>;
  totalAmount: number;
  avgReturnValue: number;
  topReasons: Array<{
    reason: string;
    count: number;
    totalAmount: number;
  }>;
}> {
  try {
    const where: Prisma.PurchaseReturnWhereInput = {
      companyId,
      ...(dateFrom && { returnDate: { gte: dateFrom } }),
      ...(dateTo && { returnDate: { lte: dateTo } }),
    };

    const returns = await prisma.purchaseReturn.findMany({
      where,
      include: {
        lines: {
          select: {
            returnReason: true,
            lineTotal: true,
          },
        },
      },
    });

    const byStatus: Record<PurchaseReturnStatus, number> = {
      draft: 0,
      posted: 0,
      partial: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalAmount = 0;
    const reasonStats = new Map<string, { count: number; amount: number }>();

    for (const ret of returns) {
      if (ret.status !== 'cancelled') {
        byStatus[ret.status as PurchaseReturnStatus]++;
        totalAmount += toNumber(ret.totalAmount);

        // جمع إحصائيات الأسباب
        for (const line of ret.lines) {
          if (line.returnReason) {
            if (!reasonStats.has(line.returnReason)) {
              reasonStats.set(line.returnReason, { count: 0, amount: 0 });
            }
            const stats = reasonStats.get(line.returnReason)!;
            stats.count++;
            stats.amount += toNumber(line.lineTotal);
          }
        }
      }
    }

    const topReasons = Array.from(reasonStats.entries())
      .map(([reason, stats]) => ({
        reason,
        count: stats.count,
        totalAmount: stats.amount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return {
      total: returns.filter(r => r.status !== 'cancelled').length,
      byStatus,
      totalAmount,
      avgReturnValue: returns.length > 0 ? totalAmount / returns.filter(r => r.status !== 'cancelled').length : 0,
      topReasons,
    };
  } catch (error) {
    logger.error('خطأ في جلب إحصائيات مردودات الشراء', error as Error);
    throw error;
  }
}

/**
 * إنشاء مردود من فاتورة شراء
 */
export async function createReturnFromInvoice(
  companyId: string,
  userId: string,
  originalInvoiceId: string,
  lines: Array<{
    itemId: string;
    originalLineId?: string;
    qty: number;
    returnReason?: string;
  }>,
  data?: {
    branchId?: string;
    warehouseId?: string;
    returnDate?: Date;
    notes?: string;
  }
): Promise<PurchaseReturnWithRelations> {
  try {
    // الحصول على الفاتورة الأصلية مع البنود
    const originalInvoice = await prisma.purchaseInvoice.findFirst({
      where: { id: originalInvoiceId, companyId },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!originalInvoice) {
      throw new Error('الفاتورة الأصلية غير موجودة');
    }

    if (originalInvoice.status === 'cancelled') {
      throw new Error('لا يمكن إنشاء مردود من فاتورة ملغاة');
    }

    // التحقق من الكميات المراد إرجاعها
    for (const line of lines) {
      const originalLine = originalInvoice.lines.find(l => l.itemId === line.itemId);
      if (!originalLine) {
        throw new Error(`الصنف ${line.itemId} غير موجود في الفاتورة الأصلية`);
      }

      // TODO: التحقق من الكمية المتاحة للإرجاع (الكمية المشتراة - الكمية المرجعة سابقاً)
    }

    // إنشاء المردود
    const purchaseReturn = await createPurchaseReturn(companyId, userId, {
      branchId: data?.branchId || originalInvoice.branchId,
      warehouseId: data?.warehouseId || originalInvoice.warehouseId,
      supplierId: originalInvoice.supplierId,
      originalInvoiceId,
      purchaseOrderId: originalInvoice.purchaseOrderId || undefined,
      returnDate: data?.returnDate,
      notes: data?.notes,
      lines: lines.map(line => {
        const originalLine = originalInvoice.lines.find(l => l.itemId === line.itemId)!;
        return {
          itemId: line.itemId,
          originalLineId: line.originalLineId || originalLine.id,
          qty: line.qty,
          unitId: originalLine.unitId,
          unitFactor: toNumber(originalLine.unitFactor),
          unitCost: toNumber(originalLine.unitCost),
          discountAmount: toNumber(originalLine.discountAmount),
          taxCodeId: originalLine.taxCodeId || undefined,
          returnReason: line.returnReason,
        };
      }),
    });

    logger.info('تم إنشاء مردود من فاتورة شراء', {
      originalInvoiceId,
      purchaseReturnId: purchaseReturn.id,
    });

    return purchaseReturn;
  } catch (error) {
    logger.error('خطأ في إنشاء مردود من فاتورة شراء', error as Error);
    throw error;
  }
}
