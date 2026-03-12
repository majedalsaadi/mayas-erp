/**
 * Mayas ERP - Types
 * أنواع TypeScript للنظام
 */

// ============================================
// الأصول الثابتة
// ============================================

export interface Company {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  legalNameAr?: string;
  legalNameEn?: string;
  taxNumber?: string;
  commercialRegistration?: string;
  phone?: string;
  email?: string;
  website?: string;
  countryCode?: string;
  city?: string;
  district?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  currencyCode: string;
  languageDefault: string;
  timezone: string;
  fiscalYearStartMonth: number;
  logoFileId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  managerUserId?: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warehouse {
  id: string;
  companyId: string;
  branchId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  warehouseType: string;
  allowSales: boolean;
  allowPurchases: boolean;
  allowTransfers: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// المستخدمون والصلاحيات
// ============================================

export interface User {
  id: string;
  companyId: string;
  employeeCode?: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  language: string;
  defaultBranchId?: string;
  defaultWarehouseId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  authUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  roles?: Role[];
}

export interface Role {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  moduleKey: string;
  permissionKey: string;
  nameAr: string;
  nameEn: string;
  description?: string;
}

// ============================================
// الأصناف والمخزون
// ============================================

export interface Item {
  id: string;
  companyId: string;
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
  itemType: string;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  hasExpiry: boolean;
  hasSerial: boolean;
  hasBatch: boolean;
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
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockBalance {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  binId?: string;
  itemId: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  avgCost: number;
  lastCost: number;
  updatedAt: Date;
}

// ============================================
// العملاء والموردون
// ============================================

export interface Customer {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  customerGroupId?: string;
  customerType: string;
  taxNumber?: string;
  commercialRegistration?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  city?: string;
  address?: string;
  creditLimit: number;
  creditDays: number;
  currentBalance: number;
  receivableAccountId?: string;
  priceTierId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  taxNumber?: string;
  commercialRegistration?: string;
  country?: string;
  currencyCode: string;
  phone?: string;
  mobile?: string;
  email?: string;
  city?: string;
  address?: string;
  payableAccountId?: string;
  paymentTermsDays: number;
  currentBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// المحاسبة
// ============================================

export interface Account {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  accountType: string;
  levelNo: number;
  isPostable: boolean;
  currencyControl: boolean;
  branchTracking: boolean;
  costCenterTracking: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  branchId: string;
  entryNo: string;
  entryDate: Date;
  sourceType?: string;
  sourceId?: string;
  description?: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  createdById?: string;
  approvedById?: string;
  createdAt: Date;
  postedAt?: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Form Types
// ============================================

export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ItemForm {
  code: string;
  nameAr: string;
  nameEn: string;
  categoryId?: string;
  unitId: string;
  taxCodeId?: string;
  trackInventory: boolean;
  isActive: boolean;
}

export interface InvoiceForm {
  customerId: string;
  branchId: string;
  warehouseId: string;
  invoiceDate: Date;
  lines: InvoiceLineForm[];
  notes?: string;
}

export interface InvoiceLineForm {
  itemId: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  notes?: string;
}

// ============================================
// تصدير أنواع المصادقة والمخزون والأصناف والضرائب والمحاسبة والمشتريات
// ============================================

export * from './auth';
export * from './inventory';
export * from './tax';
export * from './accounting';
export * from './purchasing';
