/**
 * Mayas ERP - Purchase Invoices Service
 * خدمة فواتير الشراء
 */

import prisma from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PurchaseInvoice,
  PurchaseInvoiceWithRelations,
  PurchaseInvoiceLine,
  PurchaseInvoiceLineWithItem,
  CreatePurchaseInvoiceRequest,
  UpdatePurchaseInvoiceRequest,
  PurchaseInvoiceSearchFilters,
  ListPurchasingQuery,
  PurchaseInvoiceStatus,
  PostInvoiceResult,
} from '@/types/purchasing';
import { Prisma } from '@prisma/client';

const logger = createLogger('PurchaseInvoicesService');

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
 * توليد رقم فاتورة الشراء التالي
 */
async function generatePurchaseInvoiceNumber(companyId: string): Promise<string> {
  const lastInvoice = await prisma.purchaseInvoice.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNo: true },
  });

  if (!lastInvoice) {
    return 'PI-000001';
  }

  const lastNumber = parseInt(lastInvoice.invoiceNo.replace('PI-', ''), 10);
  const nextNumber = lastNumber + 1;
  return `PI-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * حساب إجماليات فاتورة الشراء
 */
function calculateInvoiceTotals(lines: Array<{
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
 * إنشاء فاتورة شراء جديدة
 */
export async function createPurchaseInvoice(
  companyId: string,
  userId: string,
  data: CreatePurchaseInvoiceRequest
): Promise<PurchaseInvoiceWithRelations> {
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

    // التحقق من أمر الشراء (إن وجد)
    if (data.purchaseOrderId) {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id: data.purchaseOrderId, companyId },
      });

      if (!purchaseOrder) {
        throw new Error('أمر الشراء غير موجود');
      }

      if (!['approved', 'partial'].includes(purchaseOrder.status)) {
        throw new Error('حالة أمر الشراء لا تسمح بإنشاء فاتورة');
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

    // توليد رقم الفاتورة
    const invoiceNo = await generatePurchaseInvoiceNumber(companyId);

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
    const totals = calculateInvoiceTotals(linesWithCalculated);

    // حساب تاريخ الاستحقاق
    const dueDate = data.dueDate || new Date(Date.now() + supplier.paymentTermsDays * 24 * 60 * 60 * 1000);

    // إنشاء فاتورة الشراء مع البنود
    const purchaseInvoice = await prisma.purchaseInvoice.create({
      data: {
        companyId,
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        invoiceNo,
        supplierInvoiceNo: data.supplierInvoiceNo,
        invoiceDate: data.invoiceDate || new Date(),
        supplierId: data.supplierId,
        purchaseOrderId: data.purchaseOrderId,
        currencyCode: data.currencyCode || supplier.currencyCode,
        exchangeRate: toDecimal(data.exchangeRate || 1),
        dueDate,
        subtotal: toDecimal(totals.subtotal),
        discountAmount: toDecimal(totals.discountAmount),
        taxAmount: toDecimal(totals.taxAmount),
        otherCharges: toDecimal(0),
        totalAmount: toDecimal(totals.totalAmount),
        paidAmount: toDecimal(0),
        balanceDue: toDecimal(totals.totalAmount),
        status: 'draft',
        notes: data.notes,
        createdById: userId,
        lines: {
          create: linesWithCalculated.map(line => ({
            itemId: line.itemId,
            description: line.description,
            qty: toDecimal(line.qty),
            unitId: line.unitId,
            unitFactor: toDecimal(line.unitFactor),
            baseQty: toDecimal(line.baseQty),
            unitCost: toDecimal(line.unitCost),
            discountAmount: toDecimal(line.discountAmount || 0),
            taxCodeId: line.taxCodeId,
            taxAmount: toDecimal(line.taxAmount),
            lineTotal: toDecimal(line.qty * line.unitCost - (line.discountAmount || 0) + line.taxAmount),
            toBinId: line.toBinId,
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
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            poDate: true,
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

    logger.info('تم إنشاء فاتورة شراء جديدة', {
      purchaseInvoiceId: purchaseInvoice.id,
      invoiceNo: purchaseInvoice.invoiceNo,
      supplierId: purchaseInvoice.supplierId,
    });

    return {
      ...purchaseInvoice,
      subtotal: toNumber(purchaseInvoice.subtotal),
      discountAmount: toNumber(purchaseInvoice.discountAmount),
      taxAmount: toNumber(purchaseInvoice.taxAmount),
      otherCharges: toNumber(purchaseInvoice.otherCharges),
      totalAmount: toNumber(purchaseInvoice.totalAmount),
      paidAmount: toNumber(purchaseInvoice.paidAmount),
      balanceDue: toNumber(purchaseInvoice.balanceDue),
      exchangeRate: toNumber(purchaseInvoice.exchangeRate),
      purchaseOrder: purchaseInvoice.purchaseOrder ? {
        ...purchaseInvoice.purchaseOrder,
        totalAmount: toNumber(purchaseInvoice.purchaseOrder.totalAmount),
      } : null,
      lines: purchaseInvoice.lines.map(line => ({
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
    logger.error('خطأ في إنشاء فاتورة الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على فاتورة شراء بالمعرف
 */
export async function getPurchaseInvoiceById(
  companyId: string,
  purchaseInvoiceId: string
): Promise<PurchaseInvoiceWithRelations | null> {
  try {
    const purchaseInvoice = await prisma.purchaseInvoice.findFirst({
      where: {
        id: purchaseInvoiceId,
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
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            poDate: true,
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

    if (!purchaseInvoice) {
      return null;
    }

    return {
      ...purchaseInvoice,
      subtotal: toNumber(purchaseInvoice.subtotal),
      discountAmount: toNumber(purchaseInvoice.discountAmount),
      taxAmount: toNumber(purchaseInvoice.taxAmount),
      otherCharges: toNumber(purchaseInvoice.otherCharges),
      totalAmount: toNumber(purchaseInvoice.totalAmount),
      paidAmount: toNumber(purchaseInvoice.paidAmount),
      balanceDue: toNumber(purchaseInvoice.balanceDue),
      exchangeRate: toNumber(purchaseInvoice.exchangeRate),
      purchaseOrder: purchaseInvoice.purchaseOrder ? {
        ...purchaseInvoice.purchaseOrder,
        totalAmount: toNumber(purchaseInvoice.purchaseOrder.totalAmount),
      } : null,
      lines: purchaseInvoice.lines.map(line => ({
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
    logger.error('خطأ في جلب فاتورة الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على قائمة فواتير الشراء
 */
export async function getPurchaseInvoices(
  companyId: string,
  query: ListPurchasingQuery & { filters?: PurchaseInvoiceSearchFilters }
): Promise<{
  invoices: PurchaseInvoiceWithRelations[];
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
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId,
      ...(filters?.query && {
        OR: [
          { invoiceNo: { contains: filters.query, mode: 'insensitive' } },
          { supplierInvoiceNo: { contains: filters.query, mode: 'insensitive' } },
          { notes: { contains: filters.query, mode: 'insensitive' } },
        ],
      }),
      ...(filters?.supplierId && { supplierId: filters.supplierId }),
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.purchaseOrderId && { purchaseOrderId: filters.purchaseOrderId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateRange?.from && {
        invoiceDate: { gte: filters.dateRange.from },
      }),
      ...(filters?.dateRange?.to && {
        invoiceDate: { lte: filters.dateRange.to },
      }),
      ...(filters?.dueDateRange?.from && {
        dueDate: { gte: filters.dueDateRange.from },
      }),
      ...(filters?.dueDateRange?.to && {
        dueDate: { lte: filters.dueDateRange.to },
      }),
      ...(filters?.paymentStatus === 'paid' && { balanceDue: { equals: 0 } }),
      ...(filters?.paymentStatus === 'unpaid' && { paidAmount: { equals: 0 } }),
      ...(filters?.paymentStatus === 'partial' && {
        AND: [
          { paidAmount: { gt: 0 } },
          { balanceDue: { gt: 0 } },
        ],
      }),
    };

    // تحديد حقل الترتيب
    const orderBy: Prisma.PurchaseInvoiceOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'date':
        orderBy.invoiceDate = sortOrder;
        break;
      case 'number':
        orderBy.invoiceNo = sortOrder;
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

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
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
      prisma.purchaseInvoice.count({ where }),
    ]);

    return {
      invoices: invoices.map(invoice => ({
        ...invoice,
        subtotal: toNumber(invoice.subtotal),
        discountAmount: toNumber(invoice.discountAmount),
        taxAmount: toNumber(invoice.taxAmount),
        otherCharges: toNumber(invoice.otherCharges),
        totalAmount: toNumber(invoice.totalAmount),
        paidAmount: toNumber(invoice.paidAmount),
        balanceDue: toNumber(invoice.balanceDue),
        exchangeRate: toNumber(invoice.exchangeRate),
        lines: invoice.lines?.map(line => ({
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
    logger.error('خطأ في جلب فواتير الشراء', error as Error);
    throw error;
  }
}

/**
 * تحديث فاتورة شراء
 */
export async function updatePurchaseInvoice(
  companyId: string,
  userId: string,
  purchaseInvoiceId: string,
  data: UpdatePurchaseInvoiceRequest
): Promise<PurchaseInvoiceWithRelations> {
  try {
    // التحقق من وجود الفاتورة وحالتها
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, companyId },
    });

    if (!existingInvoice) {
      throw new Error('فاتورة الشراء غير موجودة');
    }

    if (existingInvoice.status !== 'draft') {
      throw new Error('لا يمكن تعديل فاتورة الشراء إلا في حالة المسودة');
    }

    // إذا كان هناك تحديث للبنود
    if (data.lines && data.lines.length > 0) {
      // التحقق من الأصناف
      const itemIds = data.lines.map(line => line.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds }, companyId },
      });

      // حذف البنود القديمة
      await prisma.purchaseInvoiceLine.deleteMany({
        where: { purchaseInvoiceId },
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
      const totals = calculateInvoiceTotals(linesWithCalculated);

      // إنشاء البنود الجديدة
      await prisma.purchaseInvoiceLine.createMany({
        data: linesWithCalculated.map(line => ({
          purchaseInvoiceId,
          itemId: line.itemId,
          description: line.description,
          qty: toDecimal(line.qty),
          unitId: line.unitId,
          unitFactor: toDecimal(line.unitFactor),
          baseQty: toDecimal(line.baseQty),
          unitCost: toDecimal(line.unitCost),
          discountAmount: toDecimal(line.discountAmount || 0),
          taxCodeId: line.taxCodeId,
          taxAmount: toDecimal(line.taxAmount),
          lineTotal: toDecimal(line.qty * line.unitCost - (line.discountAmount || 0) + line.taxAmount),
          toBinId: line.toBinId,
        })),
      });

      // تحديث الفاتورة
      await prisma.purchaseInvoice.update({
        where: { id: purchaseInvoiceId },
        data: {
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId,
          supplierInvoiceNo: data.supplierInvoiceNo,
          invoiceDate: data.invoiceDate,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate ? toDecimal(data.exchangeRate) : undefined,
          dueDate: data.dueDate,
          notes: data.notes,
          subtotal: toDecimal(totals.subtotal),
          discountAmount: toDecimal(totals.discountAmount),
          taxAmount: toDecimal(totals.taxAmount),
          totalAmount: toDecimal(totals.totalAmount),
          balanceDue: toDecimal(totals.totalAmount - toNumber(existingInvoice.paidAmount)),
        },
      });
    } else {
      // تحديث الفاتورة فقط بدون البنود
      await prisma.purchaseInvoice.update({
        where: { id: purchaseInvoiceId },
        data: {
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId,
          supplierInvoiceNo: data.supplierInvoiceNo,
          invoiceDate: data.invoiceDate,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate ? toDecimal(data.exchangeRate) : undefined,
          dueDate: data.dueDate,
          notes: data.notes,
        },
      });
    }

    logger.info('تم تحديث فاتورة الشراء', { purchaseInvoiceId });

    return (await getPurchaseInvoiceById(companyId, purchaseInvoiceId))!;
  } catch (error) {
    logger.error('خطأ في تحديث فاتورة الشراء', error as Error);
    throw error;
  }
}

/**
 * حذف فاتورة شراء
 */
export async function deletePurchaseInvoice(
  companyId: string,
  purchaseInvoiceId: string
): Promise<boolean> {
  try {
    // التحقق من وجود الفاتورة وحالتها
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, companyId },
    });

    if (!existingInvoice) {
      throw new Error('فاتورة الشراء غير موجودة');
    }

    if (existingInvoice.status !== 'draft') {
      throw new Error('لا يمكن حذف فاتورة الشراء إلا في حالة المسودة');
    }

    // حذف البنود ثم الفاتورة
    await prisma.$transaction([
      prisma.purchaseInvoiceLine.deleteMany({
        where: { purchaseInvoiceId },
      }),
      prisma.purchaseInvoice.delete({
        where: { id: purchaseInvoiceId },
      }),
    ]);

    logger.info('تم حذف فاتورة الشراء', { purchaseInvoiceId });

    return true;
  } catch (error) {
    logger.error('خطأ في حذف فاتورة الشراء', error as Error);
    throw error;
  }
}

// ============================================
// العمليات الخاصة بالحالات
// ============================================

/**
 * ترحيل فاتورة الشراء (تحديث المخزون والقيود)
 */
export async function postPurchaseInvoice(
  companyId: string,
  userId: string,
  purchaseInvoiceId: string
): Promise<PostInvoiceResult> {
  try {
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, companyId },
      include: {
        lines: true,
      },
    });

    if (!existingInvoice) {
      throw new Error('فاتورة الشراء غير موجودة');
    }

    if (existingInvoice.status !== 'draft') {
      throw new Error('لا يمكن ترحيل فاتورة الشراء إلا في حالة المسودة');
    }

    // TODO: إنشاء قيد محاسبي
    // TODO: تحديث أرصدة المخزون
    // TODO: تحديث رصيد المورد

    // تحديث حالة الفاتورة
    const updatedInvoice = await prisma.purchaseInvoice.update({
      where: { id: purchaseInvoiceId },
      data: {
        status: 'posted',
        postedAt: new Date(),
      },
    });

    logger.info('تم ترحيل فاتورة الشراء', { purchaseInvoiceId });

    return {
      success: true,
      purchaseInvoiceId,
      previousStatus: 'draft',
      newStatus: 'posted',
      postedAt: new Date(),
      stockUpdated: true,
    };
  } catch (error) {
    logger.error('خطأ في ترحيل فاتورة الشراء', error as Error);
    throw error;
  }
}

/**
 * إلغاء فاتورة الشراء
 */
export async function cancelPurchaseInvoice(
  companyId: string,
  userId: string,
  purchaseInvoiceId: string
): Promise<boolean> {
  try {
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId, companyId },
    });

    if (!existingInvoice) {
      throw new Error('فاتورة الشراء غير موجودة');
    }

    if (existingInvoice.status === 'cancelled') {
      throw new Error('الفاتورة ملغاة بالفعل');
    }

    if (toNumber(existingInvoice.paidAmount) > 0) {
      throw new Error('لا يمكن إلغاء فاتورة عليها مدفوعات');
    }

    // TODO: عكس القيود المحاسبية
    // TODO: عكس تحديث المخزون

    await prisma.purchaseInvoice.update({
      where: { id: purchaseInvoiceId },
      data: {
        status: 'cancelled',
      },
    });

    logger.info('تم إلغاء فاتورة الشراء', { purchaseInvoiceId });

    return true;
  } catch (error) {
    logger.error('خطأ في إلغاء فاتورة الشراء', error as Error);
    throw error;
  }
}

/**
 * الحصول على فواتير الشراء حسب المورد
 */
export async function getPurchaseInvoicesBySupplier(
  companyId: string,
  supplierId: string
): Promise<PurchaseInvoiceWithRelations[]> {
  const result = await getPurchaseInvoices(companyId, {
    filters: { supplierId },
    pageSize: 1000,
  });

  return result.invoices;
}

/**
 * الحصول على إحصائيات فواتير الشراء
 */
export async function getPurchaseInvoiceStatistics(
  companyId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  total: number;
  byStatus: Record<PurchaseInvoiceStatus, number>;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  avgInvoiceValue: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    invoiceCount: number;
    totalAmount: number;
  }>;
}> {
  try {
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId,
      ...(dateFrom && { invoiceDate: { gte: dateFrom } }),
      ...(dateTo && { invoiceDate: { lte: dateTo } }),
    };

    const invoices = await prisma.purchaseInvoice.findMany({
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

    const byStatus: Record<PurchaseInvoiceStatus, number> = {
      draft: 0,
      posted: 0,
      partial: 0,
      paid: 0,
      cancelled: 0,
    };

    let totalAmount = 0;
    let totalPaid = 0;
    const supplierStats = new Map<string, { name: string; count: number; amount: number }>();

    for (const invoice of invoices) {
      if (invoice.status !== 'cancelled') {
        byStatus[invoice.status as PurchaseInvoiceStatus]++;
        totalAmount += toNumber(invoice.totalAmount);
        totalPaid += toNumber(invoice.paidAmount);

        const supplierId = invoice.supplierId;
        if (!supplierStats.has(supplierId)) {
          supplierStats.set(supplierId, {
            name: invoice.supplier?.nameAr || '',
            count: 0,
            amount: 0,
          });
        }

        const stats = supplierStats.get(supplierId)!;
        stats.count++;
        stats.amount += toNumber(invoice.totalAmount);
      }
    }

    const topSuppliers = Array.from(supplierStats.entries())
      .map(([supplierId, stats]) => ({
        supplierId,
        supplierName: stats.name,
        invoiceCount: stats.count,
        totalAmount: stats.amount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return {
      total: invoices.filter(i => i.status !== 'cancelled').length,
      byStatus,
      totalAmount,
      totalPaid,
      totalPending: totalAmount - totalPaid,
      avgInvoiceValue: invoices.length > 0 ? totalAmount / invoices.filter(i => i.status !== 'cancelled').length : 0,
      topSuppliers,
    };
  } catch (error) {
    logger.error('خطأ في جلب إحصائيات فواتير الشراء', error as Error);
    throw error;
  }
}

/**
 * إنشاء فاتورة من أمر شراء
 */
export async function createInvoiceFromPurchaseOrder(
  companyId: string,
  userId: string,
  purchaseOrderId: string,
  data?: {
    supplierInvoiceNo?: string;
    invoiceDate?: Date;
    notes?: string;
  }
): Promise<PurchaseInvoiceWithRelations> {
  try {
    // الحصول على أمر الشراء مع البنود
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new Error('أمر الشراء غير موجود');
    }

    if (!['approved', 'partial'].includes(purchaseOrder.status)) {
      throw new Error('حالة أمر الشراء لا تسمح بإنشاء فاتورة');
    }

    // إنشاء الفاتورة
    const invoice = await createPurchaseInvoice(companyId, userId, {
      branchId: purchaseOrder.branchId,
      warehouseId: purchaseOrder.warehouseId,
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrderId,
      supplierInvoiceNo: data?.supplierInvoiceNo,
      invoiceDate: data?.invoiceDate,
      currencyCode: purchaseOrder.currencyCode,
      exchangeRate: toNumber(purchaseOrder.exchangeRate),
      notes: data?.notes || purchaseOrder.notes,
      lines: purchaseOrder.lines.map(line => ({
        itemId: line.itemId,
        qty: toNumber(line.qtyOrdered) - toNumber(line.qtyReceived),
        unitId: line.unitId,
        unitCost: toNumber(line.unitPrice),
        discountAmount: toNumber(line.discountAmount),
        taxCodeId: line.taxCodeId || undefined,
      })),
    });

    logger.info('تم إنشاء فاتورة من أمر شراء', {
      purchaseOrderId,
      purchaseInvoiceId: invoice.id,
    });

    return invoice;
  } catch (error) {
    logger.error('خطأ في إنشاء فاتورة من أمر شراء', error as Error);
    throw error;
  }
}
