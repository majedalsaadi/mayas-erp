/**
 * Mayas ERP - Inventory Types
 * أنواع TypeScript للمخزون والأصناف
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// أنواع الصنف الأساسية
// ============================================

/**
 * نوع الصنف
 */
export type ItemType = 'stock' | 'service' | 'bundle' | 'non_stock';

/**
 * نوع الباركود
 */
export type BarcodeType = 'ean13' | 'ean8' | 'upc' | 'code128' | 'qr';

/**
 * الصنف - Item
 */
export interface InventoryItem {
  id: string;
  companyId: string;
  code: string;
  sku?: string | null;
  nameAr: string;
  nameEn: string;
  shortName?: string | null;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  manufacturerId?: string | null;
  partNumber?: string | null;
  oemNumber?: string | null;
  unitId: string;
  purchaseUnitId?: string | null;
  salesUnitId?: string | null;
  purchaseToBaseFactor: number;
  salesToBaseFactor: number;
  itemType: ItemType;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  hasExpiry: boolean;
  hasSerial: boolean;
  hasBatch: boolean;
  weight?: number | null;
  warrantyDays?: number | null;
  taxCodeId?: string | null;
  minStockLevel?: number | null;
  maxStockLevel?: number | null;
  reorderLevel?: number | null;
  defaultBinId?: string | null;
  imageFileId?: string | null;
  inventoryAccountId?: string | null;
  salesAccountId?: string | null;
  purchaseAccountId?: string | null;
  cogsAccountId?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

/**
 * الصنف مع العلاقات - Item with Relations
 */
export interface InventoryItemWithRelations extends InventoryItem {
  category?: ItemCategory | null;
  brand?: Brand | null;
  manufacturer?: Manufacturer | null;
  unit?: Unit | null;
  purchaseUnit?: Unit | null;
  salesUnit?: Unit | null;
  barcodes?: ItemBarcode[];
  prices?: ItemPrice[];
  stockBalances?: StockBalance[];
}

/**
 * باركود الصنف - Item Barcode
 */
export interface ItemBarcode {
  id: string;
  itemId: string;
  barcode: string;
  barcodeType: BarcodeType;
  unitId?: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * سعر الصنف - Item Price
 */
export interface ItemPrice {
  id: string;
  itemId: string;
  priceTierId: string;
  currencyCode: string;
  price: number;
  minQty: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * فئة الصنف - Item Category
 */
export interface ItemCategory {
  id: string;
  companyId: string;
  parentId?: string | null;
  code: string;
  nameAr: string;
  nameEn: string;
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  salesAccountId?: string | null;
  purchaseAccountId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * الماركة - Brand
 */
export interface Brand {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  country?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * المصنع - Manufacturer
 */
export interface Manufacturer {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  country?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * الوحدة - Unit
 */
export interface Unit {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isFractionAllowed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * رصيد المخزون - Stock Balance
 */
export interface StockBalance {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  binId?: string | null;
  itemId: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  avgCost: number;
  lastCost: number;
  updatedAt: Date;
}

// ============================================
// أنواع الطلبات والاستجابات
// ============================================

/**
 * إنشاء صنف جديد - Create Item Request
 */
export interface CreateItemRequest {
  code: string;
  sku?: string;
  nameAr: string;
  nameEn: string;
  shortName?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  manufacturerId?: string;
  partNumber?: string;
  oemNumber?: string;
  unitId: string;
  purchaseUnitId?: string;
  salesUnitId?: string;
  purchaseToBaseFactor?: number;
  salesToBaseFactor?: number;
  itemType?: ItemType;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  hasExpiry?: boolean;
  hasSerial?: boolean;
  hasBatch?: boolean;
  weight?: number;
  warrantyDays?: number;
  taxCodeId?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  defaultBinId?: string;
  imageFileId?: string;
  inventoryAccountId?: string;
  salesAccountId?: string;
  purchaseAccountId?: string;
  cogsAccountId?: string;
  isActive?: boolean;
  notes?: string;
}

/**
 * تحديث صنف - Update Item Request
 */
export interface UpdateItemRequest {
  code?: string;
  sku?: string;
  nameAr?: string;
  nameEn?: string;
  shortName?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  manufacturerId?: string;
  partNumber?: string;
  oemNumber?: string;
  unitId?: string;
  purchaseUnitId?: string;
  salesUnitId?: string;
  purchaseToBaseFactor?: number;
  salesToBaseFactor?: number;
  itemType?: ItemType;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  hasExpiry?: boolean;
  hasSerial?: boolean;
  hasBatch?: boolean;
  weight?: number;
  warrantyDays?: number;
  taxCodeId?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  defaultBinId?: string;
  imageFileId?: string;
  inventoryAccountId?: string;
  salesAccountId?: string;
  purchaseAccountId?: string;
  cogsAccountId?: string;
  isActive?: boolean;
  notes?: string;
}

/**
 * معايير البحث في الأصناف - Item Search Filters
 */
export interface ItemSearchFilters {
  query?: string;
  categoryId?: string;
  brandId?: string;
  manufacturerId?: string;
  itemType?: ItemType;
  isActive?: boolean;
  trackInventory?: boolean;
  hasExpiry?: boolean;
  hasSerial?: boolean;
  hasBatch?: boolean;
  unitId?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/**
 * معايير القائمة - List Items Query
 */
export interface ListItemsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'code' | 'nameAr' | 'nameEn' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
  includeCategory?: boolean;
  includeBrand?: boolean;
  includeUnit?: boolean;
  includePrices?: boolean;
  includeStock?: boolean;
  filters?: ItemSearchFilters;
}

/**
 * نتيجة القائمة المُصفّاة - Paginated Items Result
 */
export interface PaginatedItemsResult {
  items: InventoryItemWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * استجابة API للأصناف - Item API Response
 */
export interface ItemApiResponse<T = InventoryItem> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * نتيجة البحث في الأصناف - Item Search Result
 */
export interface ItemSearchResult {
  items: InventoryItemWithRelations[];
  total: number;
  query: string;
  filters?: ItemSearchFilters;
}

// ============================================
// أنواع إضافية للمساعدة
// ============================================

/**
 * ملخص الصنف - Item Summary (للقوائم المختصرة)
 */
export interface ItemSummary {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  unitId: string;
  unitName?: string;
  isActive: boolean;
  currentStock?: number;
  avgCost?: number;
  lastCost?: number;
}

/**
 * إحصائيات الصنف - Item Statistics
 */
export interface ItemStatistics {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  itemsByType: Record<ItemType, number>;
  itemsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  lowStockItems: number;
  outOfStockItems: number;
}

/**
 * خيارات إنشاء الباركود - Create Barcode Options
 */
export interface CreateBarcodeOptions {
  barcode: string;
  barcodeType?: BarcodeType;
  unitId?: string;
  isPrimary?: boolean;
}

/**
 * خيارات تحديث الباركود - Update Barcode Options
 */
export interface UpdateBarcodeOptions {
  barcode?: string;
  barcodeType?: BarcodeType;
  unitId?: string;
  isPrimary?: boolean;
}
