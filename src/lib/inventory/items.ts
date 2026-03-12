/**
 * Mayas ERP - Items Service
 * خدمة إدارة الأصناف
 * 
 * توفر هذه الخدمة جميع العمليات الأساسية لإدارة الأصناف:
 * - إنشاء صنف جديد
 * - تحديث صنف
 * - حذف صنف
 * - جلب صنف واحد
 * - قائمة الأصناف
 * - البحث في الأصناف
 */

import { Prisma } from '@prisma/client';
import prisma from '../db';
import type {
  InventoryItem,
  InventoryItemWithRelations,
  CreateItemRequest,
  UpdateItemRequest,
  ListItemsQuery,
  PaginatedItemsResult,
  ItemSearchFilters,
  ItemSearchResult,
  ItemSummary,
} from '@/types/inventory';

// ============================================
// الأخطاء المخصصة
// ============================================

/**
 * خطأ الصنف غير موجود
 */
export class ItemNotFoundError extends Error {
  constructor(identifier: string) {
    super(`الصنف غير موجود: ${identifier}`);
    this.name = 'ItemNotFoundError';
  }
}

/**
 * خطأ تكرار الكود
 */
export class DuplicateItemCodeError extends Error {
  constructor(code: string) {
    super(`كود الصنف موجود مسبقاً: ${code}`);
    this.name = 'DuplicateItemCodeError';
  }
}

/**
 * خطأ تكرار الباركود
 */
export class DuplicateBarcodeError extends Error {
  constructor(barcode: string) {
    super(`الباركود مستخدم مسبقاً: ${barcode}`);
    this.name = 'DuplicateBarcodeError';
  }
}

/**
 * خطأ في التحقق من الصلاحيات
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'غير مصرح لك بهذه العملية') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ============================================
// دوال مساعدة
// ============================================

/**
 * تحويل Decimal إلى number
 */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (!value) return null;
  return Number(value);
}

/**
 * تحويل قيمة إلى Decimal
 */
function toDecimal(value: number | undefined | null): Prisma.Decimal | undefined {
  if (value === undefined || value === null) return undefined;
  return new Prisma.Decimal(value);
}

/**
 * بناء شرط البحث من الفلاتر
 */
function buildWhereClause(
  companyId: string,
  filters?: ItemSearchFilters,
  includeInactive: boolean = false
): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {
    companyId,
  };

  if (!includeInactive) {
    where.isActive = true;
  }

  if (filters) {
    // البحث النصي
    if (filters.query) {
      where.OR = [
        { code: { contains: filters.query, mode: 'insensitive' } },
        { nameAr: { contains: filters.query, mode: 'insensitive' } },
        { nameEn: { contains: filters.query, mode: 'insensitive' } },
        { sku: { contains: filters.query, mode: 'insensitive' } },
        { partNumber: { contains: filters.query, mode: 'insensitive' } },
        { oemNumber: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // فلاتر مباشرة
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.manufacturerId) where.manufacturerId = filters.manufacturerId;
    if (filters.itemType) where.itemType = filters.itemType;
    if (filters.unitId) where.unitId = filters.unitId;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (typeof filters.trackInventory === 'boolean') where.trackInventory = filters.trackInventory;
    if (typeof filters.hasExpiry === 'boolean') where.hasExpiry = filters.hasExpiry;
    if (typeof filters.hasSerial === 'boolean') where.hasSerial = filters.hasSerial;
    if (typeof filters.hasBatch === 'boolean') where.hasBatch = filters.hasBatch;

    // فلتر مستوى المخزون
    if (filters.minStockLevel !== undefined || filters.maxStockLevel !== undefined) {
      where.minStockLevel = {};
      if (filters.minStockLevel !== undefined) {
        where.minStockLevel.gte = toDecimal(filters.minStockLevel);
      }
      if (filters.maxStockLevel !== undefined) {
        where.minStockLevel.lte = toDecimal(filters.maxStockLevel);
      }
    }

    // فلتر نطاق التاريخ
    if (filters.dateRange) {
      where.createdAt = {};
      if (filters.dateRange.from) {
        where.createdAt.gte = filters.dateRange.from;
      }
      if (filters.dateRange.to) {
        where.createdAt.lte = filters.dateRange.to;
      }
    }
  }

  return where;
}

// ============================================
// العمليات الأساسية (CRUD)
// ============================================

/**
 * إنشاء صنف جديد
 * 
 * @param companyId - معرف الشركة
 * @param data - بيانات الصنف
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns الصنف المُنشأ
 * @throws DuplicateItemCodeError إذا كان الكود موجوداً مسبقاً
 */
export async function createItem(
  companyId: string,
  data: CreateItemRequest,
  userId?: string
): Promise<InventoryItem> {
  // التحقق من عدم تكرار الكود
  const existingByCode = await prisma.item.findFirst({
    where: {
      companyId,
      code: data.code,
    },
  });

  if (existingByCode) {
    throw new DuplicateItemCodeError(data.code);
  }

  // التحقق من عدم تكرار SKU إذا تم تقديمه
  if (data.sku) {
    const existingBySku = await prisma.item.findUnique({
      where: { sku: data.sku },
    });

    if (existingBySku) {
      throw new Error(`SKU موجود مسبقاً: ${data.sku}`);
    }
  }

  // إنشاء الصنف
  const item = await prisma.item.create({
    data: {
      companyId,
      code: data.code,
      sku: data.sku,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      shortName: data.shortName,
      description: data.description,
      categoryId: data.categoryId,
      brandId: data.brandId,
      manufacturerId: data.manufacturerId,
      partNumber: data.partNumber,
      oemNumber: data.oemNumber,
      unitId: data.unitId,
      purchaseUnitId: data.purchaseUnitId,
      salesUnitId: data.salesUnitId,
      purchaseToBaseFactor: toDecimal(data.purchaseToBaseFactor) || new Prisma.Decimal(1),
      salesToBaseFactor: toDecimal(data.salesToBaseFactor) || new Prisma.Decimal(1),
      itemType: data.itemType || 'stock',
      trackInventory: data.trackInventory ?? true,
      allowNegativeStock: data.allowNegativeStock ?? false,
      hasExpiry: data.hasExpiry ?? false,
      hasSerial: data.hasSerial ?? false,
      hasBatch: data.hasBatch ?? false,
      weight: toDecimal(data.weight),
      warrantyDays: data.warrantyDays,
      taxCodeId: data.taxCodeId,
      minStockLevel: toDecimal(data.minStockLevel),
      maxStockLevel: toDecimal(data.maxStockLevel),
      reorderLevel: toDecimal(data.reorderLevel),
      defaultBinId: data.defaultBinId,
      imageFileId: data.imageFileId,
      inventoryAccountId: data.inventoryAccountId,
      salesAccountId: data.salesAccountId,
      purchaseAccountId: data.purchaseAccountId,
      cogsAccountId: data.cogsAccountId,
      isActive: data.isActive ?? true,
      notes: data.notes,
      createdBy: userId,
    },
  });

  return {
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  } as InventoryItem;
}

/**
 * تحديث صنف موجود
 * 
 * @param companyId - معرف الشركة
 * @param itemId - معرف الصنف
 * @param data - بيانات التحديث
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns الصنف المُحدث
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 * @throws DuplicateItemCodeError إذا كان الكود الجديد موجوداً مسبقاً
 */
export async function updateItem(
  companyId: string,
  itemId: string,
  data: UpdateItemRequest,
  userId?: string
): Promise<InventoryItem> {
  // التحقق من وجود الصنف
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      companyId,
    },
  });

  if (!existing) {
    throw new ItemNotFoundError(itemId);
  }

  // التحقق من عدم تكرار الكود إذا تم تغييره
  if (data.code && data.code !== existing.code) {
    const duplicateCode = await prisma.item.findFirst({
      where: {
        companyId,
        code: data.code,
        id: { not: itemId },
      },
    });

    if (duplicateCode) {
      throw new DuplicateItemCodeError(data.code);
    }
  }

  // التحقق من عدم تكرار SKU إذا تم تغييره
  if (data.sku && data.sku !== existing.sku) {
    const duplicateSku = await prisma.item.findUnique({
      where: { sku: data.sku },
    });

    if (duplicateSku && duplicateSku.id !== itemId) {
      throw new Error(`SKU موجود مسبقاً: ${data.sku}`);
    }
  }

  // تحديث الصنف
  const updateData: Prisma.ItemUpdateInput = {
    ...(data.code && { code: data.code }),
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.nameAr && { nameAr: data.nameAr }),
    ...(data.nameEn && { nameEn: data.nameEn }),
    ...(data.shortName !== undefined && { shortName: data.shortName }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.categoryId !== undefined && { category: { connect: { id: data.categoryId } } }),
    ...(data.brandId !== undefined && { brand: { connect: { id: data.brandId } } }),
    ...(data.manufacturerId !== undefined && { manufacturer: { connect: { id: data.manufacturerId } } }),
    ...(data.partNumber !== undefined && { partNumber: data.partNumber }),
    ...(data.oemNumber !== undefined && { oemNumber: data.oemNumber }),
    ...(data.unitId && { unit: { connect: { id: data.unitId } } }),
    ...(data.purchaseUnitId !== undefined && { purchaseUnit: data.purchaseUnitId ? { connect: { id: data.purchaseUnitId } } : { disconnect: true } }),
    ...(data.salesUnitId !== undefined && { salesUnit: data.salesUnitId ? { connect: { id: data.salesUnitId } } : { disconnect: true } }),
    ...(data.purchaseToBaseFactor !== undefined && { purchaseToBaseFactor: toDecimal(data.purchaseToBaseFactor) }),
    ...(data.salesToBaseFactor !== undefined && { salesToBaseFactor: toDecimal(data.salesToBaseFactor) }),
    ...(data.itemType && { itemType: data.itemType }),
    ...(data.trackInventory !== undefined && { trackInventory: data.trackInventory }),
    ...(data.allowNegativeStock !== undefined && { allowNegativeStock: data.allowNegativeStock }),
    ...(data.hasExpiry !== undefined && { hasExpiry: data.hasExpiry }),
    ...(data.hasSerial !== undefined && { hasSerial: data.hasSerial }),
    ...(data.hasBatch !== undefined && { hasBatch: data.hasBatch }),
    ...(data.weight !== undefined && { weight: toDecimal(data.weight) }),
    ...(data.warrantyDays !== undefined && { warrantyDays: data.warrantyDays }),
    ...(data.taxCodeId !== undefined && { taxCode: data.taxCodeId ? { connect: { id: data.taxCodeId } } : { disconnect: true } }),
    ...(data.minStockLevel !== undefined && { minStockLevel: toDecimal(data.minStockLevel) }),
    ...(data.maxStockLevel !== undefined && { maxStockLevel: toDecimal(data.maxStockLevel) }),
    ...(data.reorderLevel !== undefined && { reorderLevel: toDecimal(data.reorderLevel) }),
    ...(data.defaultBinId !== undefined && { defaultBin: data.defaultBinId ? { connect: { id: data.defaultBinId } } : { disconnect: true } }),
    ...(data.imageFileId !== undefined && { imageFile: data.imageFileId ? { connect: { id: data.imageFileId } } : { disconnect: true } }),
    ...(data.inventoryAccountId !== undefined && { inventoryAccount: data.inventoryAccountId ? { connect: { id: data.inventoryAccountId } } : { disconnect: true } }),
    ...(data.salesAccountId !== undefined && { salesAccount: data.salesAccountId ? { connect: { id: data.salesAccountId } } : { disconnect: true } }),
    ...(data.purchaseAccountId !== undefined && { purchaseAccount: data.purchaseAccountId ? { connect: { id: data.purchaseAccountId } } : { disconnect: true } }),
    ...(data.cogsAccountId !== undefined && { cogsAccount: data.cogsAccountId ? { connect: { id: data.cogsAccountId } } : { disconnect: true } }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
    ...(data.notes !== undefined && { notes: data.notes }),
    updatedBy: userId,
  };

  const item = await prisma.item.update({
    where: { id: itemId },
    data: updateData,
  });

  return {
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  } as InventoryItem;
}

/**
 * حذف صنف (تعطيل)
 * 
 * ملاحظة: يتم تعطيل الصنف بدلاً من حذفه فعلياً للحفاظ على سلامة البيانات
 * 
 * @param companyId - معرف الشركة
 * @param itemId - معرف الصنف
 * @param userId - معرف المستخدم (اختياري للتدقيق)
 * @returns true إذا تم الحذف بنجاح
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 */
export async function deleteItem(
  companyId: string,
  itemId: string,
  userId?: string
): Promise<boolean> {
  // التحقق من وجود الصنف
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      companyId,
    },
  });

  if (!existing) {
    throw new ItemNotFoundError(itemId);
  }

  // تعطيل الصنف (soft delete)
  await prisma.item.update({
    where: { id: itemId },
    data: {
      isActive: false,
      updatedBy: userId,
    },
  });

  return true;
}

/**
 * حذف صنف نهائياً (hard delete)
 * 
 * @param companyId - معرف الشركة
 * @param itemId - معرف الصنف
 * @returns true إذا تم الحذف بنجاح
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 * @throws Error إذا كان الصنف مستخدماً في حركات
 */
export async function deleteItemPermanently(
  companyId: string,
  itemId: string
): Promise<boolean> {
  // التحقق من وجود الصنف
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      companyId,
    },
    include: {
      _count: {
        select: {
          stockBalances: true,
          barcodes: true,
          prices: true,
        },
      },
    },
  });

  if (!existing) {
    throw new ItemNotFoundError(itemId);
  }

  // التحقق من عدم وجود رصيد أو حركات
  if (existing._count.stockBalances > 0) {
    throw new Error('لا يمكن حذف الصنف لوجود أرصدة مرتبطة به');
  }

  // حذف الباركودات والأسعار المرتبطة
  await prisma.$transaction([
    prisma.itemBarcode.deleteMany({ where: { itemId } }),
    prisma.itemPrice.deleteMany({ where: { itemId } }),
    prisma.item.delete({ where: { id: itemId } }),
  ]);

  return true;
}

/**
 * جلب صنف واحد بالمعرف
 * 
 * @param companyId - معرف الشركة
 * @param itemId - معرف الصنف
 * @param includeRelations - تضمين العلاقات (اختياري)
 * @returns الصنف المطلوب
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 */
export async function getItem(
  companyId: string,
  itemId: string,
  includeRelations: boolean = false
): Promise<InventoryItem | InventoryItemWithRelations> {
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      companyId,
    },
    include: includeRelations
      ? {
          category: true,
          brand: true,
          manufacturer: true,
          unit: true,
          purchaseUnit: true,
          salesUnit: true,
          barcodes: true,
          prices: {
            where: { isActive: true },
            include: { priceTier: true },
          },
          stockBalances: {
            include: {
              warehouse: true,
              bin: true,
            },
          },
        }
      : undefined,
  });

  if (!item) {
    throw new ItemNotFoundError(itemId);
  }

  return {
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  } as InventoryItem | InventoryItemWithRelations;
}

/**
 * جلب صنف بالكود أو SKU
 * 
 * @param companyId - معرف الشركة
 * @param identifier - الكود أو SKU
 * @param includeRelations - تضمين العلاقات (اختياري)
 * @returns الصنف المطلوب
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 */
export async function getItemByIdentifier(
  companyId: string,
  identifier: string,
  includeRelations: boolean = false
): Promise<InventoryItem | InventoryItemWithRelations> {
  const item = await prisma.item.findFirst({
    where: {
      companyId,
      OR: [
        { code: identifier },
        { sku: identifier },
      ],
    },
    include: includeRelations
      ? {
          category: true,
          brand: true,
          manufacturer: true,
          unit: true,
          purchaseUnit: true,
          salesUnit: true,
          barcodes: true,
          prices: {
            where: { isActive: true },
            include: { priceTier: true },
          },
          stockBalances: {
            include: {
              warehouse: true,
              bin: true,
            },
          },
        }
      : undefined,
  });

  if (!item) {
    throw new ItemNotFoundError(identifier);
  }

  return {
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  } as InventoryItem | InventoryItemWithRelations;
}

/**
 * قائمة الأصناف مع التصفح والترتيب
 * 
 * @param companyId - معرف الشركة
 * @param query - معايير البحث والتصفح
 * @returns قائمة الأصناف مع معلومات التصفح
 */
export async function listItems(
  companyId: string,
  query: ListItemsQuery = {}
): Promise<PaginatedItemsResult> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeInactive = false,
    includeCategory = false,
    includeBrand = false,
    includeUnit = false,
    includePrices = false,
    includeStock = false,
    filters,
  } = query;

  const where = buildWhereClause(companyId, filters, includeInactive);

  // تحديد العلاقات المطلوبة
  const include: Prisma.ItemInclude = {};
  if (includeCategory) include.category = true;
  if (includeBrand) include.brand = true;
  if (includeUnit) {
    include.unit = true;
    include.purchaseUnit = true;
    include.salesUnit = true;
  }
  if (includePrices) {
    include.prices = {
      where: { isActive: true },
      include: { priceTier: true },
    };
  }
  if (includeStock) {
    include.stockBalances = {
      include: {
        warehouse: true,
        bin: true,
      },
    };
  }

  // حساب العدد الإجمالي
  const total = await prisma.item.count({ where });

  // جلب البيانات
  const items = await prisma.item.findMany({
    where,
    include: Object.keys(include).length > 0 ? include : undefined,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // تحويل البيانات
  const transformedItems = items.map((item) => ({
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  })) as InventoryItemWithRelations[];

  return {
    items: transformedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * البحث في الأصناف
 * 
 * @param companyId - معرف الشركة
 * @param query - نص البحث
 * @param filters - فلاتر البحث (اختياري)
 * @param limit - عدد النتائج (اختياري، افتراضياً 20)
 * @returns نتائج البحث
 */
export async function searchItems(
  companyId: string,
  query: string,
  filters?: ItemSearchFilters,
  limit: number = 20
): Promise<ItemSearchResult> {
  const searchFilters: ItemSearchFilters = {
    ...filters,
    query,
  };

  const where = buildWhereClause(companyId, searchFilters, true);

  const items = await prisma.item.findMany({
    where,
    include: {
      category: true,
      brand: true,
      unit: true,
      barcodes: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    take: limit,
    orderBy: {
      code: 'asc',
    },
  });

  const transformedItems = items.map((item) => ({
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  })) as InventoryItemWithRelations[];

  const total = await prisma.item.count({ where });

  return {
    items: transformedItems,
    total,
    query,
    filters: searchFilters,
  };
}

/**
 * جلب ملخصات الأصناف (للقوائم المختصرة)
 * 
 * @param companyId - معرف الشركة
 * @param warehouseId - معرف المستودع (اختياري لجلب المخزون)
 * @param activeOnly - جلب الأصناف النشطة فقط
 * @returns قائمة ملخصات الأصناف
 */
export async function getItemSummaries(
  companyId: string,
  warehouseId?: string,
  activeOnly: boolean = true
): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: {
      companyId,
      isActive: activeOnly ? true : undefined,
    },
    include: {
      unit: true,
      ...(warehouseId && {
        stockBalances: {
          where: { warehouseId },
          take: 1,
        },
      }),
    },
    orderBy: {
      code: 'asc',
    },
  });

  return items.map((item) => ({
    id: item.id,
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    unitId: item.unitId,
    unitName: item.unit?.nameAr,
    isActive: item.isActive,
    currentStock: warehouseId && item.stockBalances?.[0]
      ? decimalToNumber(item.stockBalances[0].qtyOnHand)
      : undefined,
    avgCost: warehouseId && item.stockBalances?.[0]
      ? decimalToNumber(item.stockBalances[0].avgCost)
      : undefined,
    lastCost: warehouseId && item.stockBalances?.[0]
      ? decimalToNumber(item.stockBalances[0].lastCost)
      : undefined,
  }));
}

/**
 * التحقق من وجود صنف
 * 
 * @param companyId - معرف الشركة
 * @param itemId - معرف الصنف
 * @returns true إذا كان الصنف موجوداً
 */
export async function itemExists(companyId: string, itemId: string): Promise<boolean> {
  const count = await prisma.item.count({
    where: {
      id: itemId,
      companyId,
    },
  });

  return count > 0;
}

/**
 * جلب صنف بالباركود
 * 
 * @param barcode - الباركود
 * @param companyId - معرف الشركة (اختياري)
 * @returns الصنف المطلوب
 * @throws ItemNotFoundError إذا لم يتم العثور على الصنف
 */
export async function getItemByBarcode(
  barcode: string,
  companyId?: string
): Promise<InventoryItemWithRelations> {
  const barcodeRecord = await prisma.itemBarcode.findUnique({
    where: { barcode },
    include: {
      item: {
        include: {
          category: true,
          brand: true,
          unit: true,
          barcodes: true,
        },
      },
    },
  });

  if (!barcodeRecord) {
    throw new ItemNotFoundError(`Barcode: ${barcode}`);
  }

  if (companyId && barcodeRecord.item.companyId !== companyId) {
    throw new ItemNotFoundError(`Barcode: ${barcode}`);
  }

  const item = barcodeRecord.item;

  return {
    ...item,
    purchaseToBaseFactor: decimalToNumber(item.purchaseToBaseFactor) || 1,
    salesToBaseFactor: decimalToNumber(item.salesToBaseFactor) || 1,
    weight: decimalToNumber(item.weight),
    minStockLevel: decimalToNumber(item.minStockLevel),
    maxStockLevel: decimalToNumber(item.maxStockLevel),
    reorderLevel: decimalToNumber(item.reorderLevel),
  } as InventoryItemWithRelations;
}
