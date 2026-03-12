/**
 * Mayas ERP - Purchase Orders Service
 * خدمة أوامر الشراء
 */

import prisma from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PurchaseOrder,
  PurchaseOrderWithRelations,
  PurchaseOrderLine,
  PurchaseOrderLineWithItem,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseOrderSearchFilters,
  ListPurchasingQuery,
  PurchaseOrderStatus,
  ApprovePurchaseOrderResult,
  ReceivePurchaseOrderResult,
} from '@/types/purchasing';
import { Prisma } from '@prisma/client';

const logger = createLogger('PurchaseOrdersService');

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
 * توليد رقم أمر الشراء التالي
 */
async function generatePurchaseOrderNumber(companyId: string): Promise<string> {
  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { poNo: true },
  });

  if (!lastOrder) {
    return 'PO-000001';
  }

  const lastNumber = parseInt(lastOrder.poNo.replace('PO-', ''), 10);
  const nextNumber = lastNumber + 1;
  return `PO-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * حساب إجماليات أمر الشراء
 */
function calculateOrderTotals(lines: Array<{
  qtyOrdered: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
}>): { subtotal: number; discountAmount: number; taxAmount: number; totalAmount: number } {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const lineTotal = line.qtyOrdered * line.unitPrice;
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
 * إنشاء أمر شراء جديد
 */
export async function createPurchaseOrder(
  companyId: string,
  userId: string,
  data: CreatePurchaseOrderRequest
): Promise<PurchaseOrderWithRelations> {
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

    // التحقق من الأصناف
    const itemIds = data.lines.map(line => line.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds }, companyId },
    });

    if (items.length !== itemIds.length) {
      throw new Error('بعض الأصناف غير موجودة');
    }

    // توليد رقم أمر الشراء
    const poNo = await generatePurchaseOrderNumber(companyId);

    // حساب الضرائب للبنود
    const linesWithTax = await Promise.all(
      data.lines.map(async (line) => {
        let taxAmount = 0;

        if (line.taxCodeId) {
          const taxCode = await prisma.taxCode.findUnique({
            where: { id: line.taxCodeId },
          });

          if (taxCode) {
            const lineTotal = line.qtyOrdered * line.unitPrice - (line.discountAmount || 0);
            taxAmount = lineTotal * toNumber(taxCode.rate) / 100;
          }
        }

        return {
          ...line,
          taxAmount,
        };
      })
    );

    // حساب الإجماليات
    const totals = calculateOrderTotals(linesWithTax);

    // إنشاء أمر الشراء مع البنود
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        companyId,
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        poNo,
        poDate: data.poDate || new Date(),
        supplierId: data.supplierId,
        currencyCode: data.currencyCode || supplier.currencyCode,
        exchangeRate: toDecimal(data.exchangeRate || 1),
        expectedDate: data.expectedDate,
        subtotal: toDecimal(totals.subtotal),
        discountAmount: toDecimal(totals.discountAmount),
        taxAmount: toDecimal(totals.taxAmount),
        totalAmount: toDecimal(totals.totalAmount),
        status: 'draft',
        notes: data.notes,
        createdById: userId,
        lines: {
          create: linesWithTax.map(line => ({
            itemId: line.itemId,
            qtyOrdered: toDecimal(line.qtyOrdered),
            qtyReceived: toDecimal(0),
            unitId: line.unitId,
            unitPrice: toDecimal(line.unitPrice),
            discountAmount: toDecimal(line.discountAmount || 0),
            taxCodeId: line.taxCodeId,
            taxAmount: toDecimal(line.taxAmount),
            lineTotal: toDecimal(line.qtyOrdered * line.unitPrice - (line.discountAmount || 0) + line.taxAmount),
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

    logger.info('تم إنشاء أمر شراء جديد', {
      purchaseOrderId: purchaseOrder.id,
      poNo: purchaseOrder.poNo,
      supplierId: purchaseOrder.supplierId,
    });

    return {
      ...purchaseOrder,
      subtotal: toNumber(purchaseOrder.subtotal),
      discountAmount: toNumber(purchaseOrder.discountAmount),
      taxAmount: toNumber(purchaseOrder.taxAmount),
      totalAmount: toNumber(purchaseOrder.totalAmount),
      exchangeRate: toNumber(purchaseOrder.exchangeRate),
      lines: purchaseOrder.lines.map(line => ({
        ...line,
        qtyOrdered: toNumber(line.qtyOrdered),
        qtyReceived: toNumber(line.qtyReceived),
        unitPrice: toNumber(line.unitPrice),
        discountAmount: toNumber(line.discountAmount),
        taxAmount: toNumber(line.taxAmount),
        lineTotal: toNumber(line.lineTotal),
      })),
    };
  } catch (error) {
    logger.error('خطأ في إنشاء أمر الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على أمر شراء بالمعرف
 */
export async function getPurchaseOrderById(
  companyId: string,
  purchaseOrderId: string
): Promise<PurchaseOrderWithRelations | null> {
  try {
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
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

    if (!purchaseOrder) {
      return null;
    }

    return {
      ...purchaseOrder,
      subtotal: toNumber(purchaseOrder.subtotal),
      discountAmount: toNumber(purchaseOrder.discountAmount),
      taxAmount: toNumber(purchaseOrder.taxAmount),
      totalAmount: toNumber(purchaseOrder.totalAmount),
      exchangeRate: toNumber(purchaseOrder.exchangeRate),
      lines: purchaseOrder.lines.map(line => ({
        ...line,
        qtyOrdered: toNumber(line.qtyOrdered),
        qtyReceived: toNumber(line.qtyReceived),
        unitPrice: toNumber(line.unitPrice),
        discountAmount: toNumber(line.discountAmount),
        taxAmount: toNumber(line.taxAmount),
        lineTotal: toNumber(line.lineTotal),
      })),
    };
  } catch (error) {
    logger.error('خطأ في جلب أمر الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على قائمة أوامر الشراء
 */
export async function getPurchaseOrders(
  companyId: string,
  query: ListPurchasingQuery & { filters?: PurchaseOrderSearchFilters }
): Promise<{
  orders: PurchaseOrderWithRelations[];
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
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(filters?.query && {
        OR: [
          { poNo: { contains: filters.query, mode: 'insensitive' } },
          { notes: { contains: filters.query, mode: 'insensitive' } },
        ],
      }),
      ...(filters?.supplierId && { supplierId: filters.supplierId }),
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateRange?.from && {
        poDate: { gte: filters.dateRange.from },
      }),
      ...(filters?.dateRange?.to && {
        poDate: { lte: filters.dateRange.to },
      }),
      ...(filters?.expectedDateRange?.from && {
        expectedDate: { gte: filters.expectedDateRange.from },
      }),
      ...(filters?.expectedDateRange?.to && {
        expectedDate: { lte: filters.expectedDateRange.to },
      }),
    };

    // تحديد حقل الترتيب
    const orderBy: Prisma.PurchaseOrderOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'date':
        orderBy.poDate = sortOrder;
        break;
      case 'number':
        orderBy.poNo = sortOrder;
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

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
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
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      orders: orders.map(order => ({
        ...order,
        subtotal: toNumber(order.subtotal),
        discountAmount: toNumber(order.discountAmount),
        taxAmount: toNumber(order.taxAmount),
        totalAmount: toNumber(order.totalAmount),
        exchangeRate: toNumber(order.exchangeRate),
        lines: order.lines?.map(line => ({
          ...line,
          qtyOrdered: toNumber(line.qtyOrdered),
          qtyReceived: toNumber(line.qtyReceived),
          unitPrice: toNumber(line.unitPrice),
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
    logger.error('خطأ في جلب أوامر الشراء', error as Error);
    throw error;
  }
}

/**
 * تحديث أمر شراء
 */
export async function updatePurchaseOrder(
  companyId: string,
  userId: string,
  purchaseOrderId: string,
  data: UpdatePurchaseOrderRequest
): Promise<PurchaseOrderWithRelations> {
  try {
    // التحقق من وجود أمر الشراء وحالته
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
    });

    if (!existingOrder) {
      throw new Error('أمر الشراء غير موجود');
    }

    if (existingOrder.status !== 'draft') {
      throw new Error('لا يمكن تعديل أمر الشراء إلا في حالة المسودة');
    }

    // إذا كان هناك تحديث للبنود
    if (data.lines && data.lines.length > 0) {
      // حذف البنود القديمة
      await prisma.purchaseOrderLine.deleteMany({
        where: { purchaseOrderId },
      });

      // حساب الضرائب للبنود الجديدة
      const linesWithTax = await Promise.all(
        data.lines.map(async (line) => {
          let taxAmount = 0;

          if (line.taxCodeId) {
            const taxCode = await prisma.taxCode.findUnique({
              where: { id: line.taxCodeId },
            });

            if (taxCode) {
              const lineTotal = line.qtyOrdered * line.unitPrice - (line.discountAmount || 0);
              taxAmount = lineTotal * toNumber(taxCode.rate) / 100;
            }
          }

          return {
            ...line,
            taxAmount,
          };
        })
      );

      // حساب الإجماليات الجديدة
      const totals = calculateOrderTotals(linesWithTax);

      // إنشاء البنود الجديدة
      await prisma.purchaseOrderLine.createMany({
        data: linesWithTax.map(line => ({
          purchaseOrderId,
          itemId: line.itemId,
          qtyOrdered: toDecimal(line.qtyOrdered),
          qtyReceived: toDecimal(0),
          unitId: line.unitId,
          unitPrice: toDecimal(line.unitPrice),
          discountAmount: toDecimal(line.discountAmount || 0),
          taxCodeId: line.taxCodeId,
          taxAmount: toDecimal(line.taxAmount),
          lineTotal: toDecimal(line.qtyOrdered * line.unitPrice - (line.discountAmount || 0) + line.taxAmount),
        })),
      });

      // تحديث أمر الشراء
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          supplierId: data.supplierId,
          poDate: data.poDate,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate ? toDecimal(data.exchangeRate) : undefined,
          expectedDate: data.expectedDate,
          notes: data.notes,
          subtotal: toDecimal(totals.subtotal),
          discountAmount: toDecimal(totals.discountAmount),
          taxAmount: toDecimal(totals.taxAmount),
          totalAmount: toDecimal(totals.totalAmount),
        },
      });
    } else {
      // تحديث أمر الشراء فقط بدون البنود
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          supplierId: data.supplierId,
          poDate: data.poDate,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate ? toDecimal(data.exchangeRate) : undefined,
          expectedDate: data.expectedDate,
          notes: data.notes,
        },
      });
    }

    logger.info('تم تحديث أمر الشراء', { purchaseOrderId });

    return (await getPurchaseOrderById(companyId, purchaseOrderId))!;
  } catch (error) {
    logger.error('خطأ في تحديث أمر الشراء', error as Error);
    throw error;
  }
}

/**
 * حذف أمر شراء
 */
export async function deletePurchaseOrder(
  companyId: string,
  purchaseOrderId: string
): Promise<boolean> {
  try {
    // التحقق من وجود أمر الشراء وحالته
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
    });

    if (!existingOrder) {
      throw new Error('أمر الشراء غير موجود');
    }

    if (existingOrder.status !== 'draft') {
      throw new Error('لا يمكن حذف أمر الشراء إلا في حالة المسودة');
    }

    // حذف البنود ثم أمر الشراء
    await prisma.$transaction([
      prisma.purchaseOrderLine.deleteMany({
        where: { purchaseOrderId },
      }),
      prisma.purchaseOrder.delete({
        where: { id: purchaseOrderId },
      }),
    ]);

    logger.info('تم حذف أمر الشراء', { purchaseOrderId });

    return true;
  } catch (error) {
    logger.error('خطأ في حذف أمر الشراء', error as Error);
    throw error;
  }
}

// ============================================
// العمليات الخاصة بالحالات
// ============================================

/**
 * اعتماد أمر الشراء
 */
export async function approvePurchaseOrder(
  companyId: string,
  userId: string,
  purchaseOrderId: string
): Promise<ApprovePurchaseOrderResult> {
  try {
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
    });

    if (!existingOrder) {
      throw new Error('أمر الشراء غير موجود');
    }

    if (existingOrder.status !== 'draft') {
      throw new Error('لا يمكن اعتماد أمر الشراء إلا في حالة المسودة');
    }

    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'approved',
      },
    });

    logger.info('تم اعتماد أمر الشراء', { purchaseOrderId });

    return {
      success: true,
      purchaseOrderId,
      previousStatus: 'draft',
      newStatus: 'approved',
      approvedAt: new Date(),
    };
  } catch (error) {
    logger.error('خطأ في اعتماد أمر الشراء', error as Error);
    throw error;
  }
}

/**
 * إلغاء أمر الشراء
 */
export async function cancelPurchaseOrder(
  companyId: string,
  userId: string,
  purchaseOrderId: string
): Promise<boolean> {
  try {
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
    });

    if (!existingOrder) {
      throw new Error('أمر الشراء غير موجود');
    }

    if (!['draft', 'approved', 'pending'].includes(existingOrder.status)) {
      throw new Error('لا يمكن إلغاء أمر الشراء في الحالة الحالية');
    }

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'cancelled',
      },
    });

    logger.info('تم إلغاء أمر الشراء', { purchaseOrderId });

    return true;
  } catch (error) {
    logger.error('خطأ في إلغاء أمر الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على أوامر الشراء حسب المورد
 */
export async function getPurchaseOrdersBySupplier(
  companyId: string,
  supplierId: string
): Promise<PurchaseOrderWithRelations[]> {
  const result = await getPurchaseOrders(companyId, {
    filters: { supplierId },
    pageSize: 1000,
  });

  return result.orders;
}

/**
 * الحصول على إحصائيات أوامر الشراء
 */
export async function getPurchaseOrderStatistics(
  companyId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  total: number;
  byStatus: Record<PurchaseOrderStatus, number>;
  totalAmount: number;
  avgOrderValue: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    orderCount: number;
    totalAmount: number;
  }>;
}> {
  try {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(dateFrom && { poDate: { gte: dateFrom } }),
      ...(dateTo && { poDate: { lte: dateTo } }),
    };

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    const byStatus: Record<PurchaseOrderStatus, number> = {
      draft: 0,
      pending: 0,
      approved: 0,
      partial: 0,
      received: 0,
      cancelled: 0,
    };

    let totalAmount = 0;
    const supplierStats = new Map<string, { name: string; count: number; amount: number }>();

    for (const order of orders) {
      byStatus[order.status as PurchaseOrderStatus]++;
      totalAmount += toNumber(order.totalAmount);

      const supplierId = order.supplierId;
      if (!supplierStats.has(supplierId)) {
        supplierStats.set(supplierId, {
          name: order.supplier?.nameAr || '',
          count: 0,
          amount: 0,
        });
      }

      const stats = supplierStats.get(supplierId)!;
      stats.count++;
      stats.amount += toNumber(order.totalAmount);
    }

    const topSuppliers = Array.from(supplierStats.entries())
      .map(([supplierId, stats]) => ({
        supplierId,
        supplierName: stats.name,
        orderCount: stats.count,
        totalAmount: stats.amount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return {
      total: orders.length,
      byStatus,
      totalAmount,
      avgOrderValue: orders.length > 0 ? totalAmount / orders.length : 0,
      topSuppliers,
    };
  } catch (error) {
    logger.error('خطأ في جلب إحصائيات أوامر الشراء', error as Error);
    throw error;
  }
}
