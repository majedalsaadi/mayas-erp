/**
 * Mayas ERP - Purchasing Types
 * أنواع TypeScript للمشتريات
 */

// ============================================
// أوامر الشراء - Purchase Orders
// ============================================

/**
 * حالة أمر الشراء
 */
export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'partial' | 'received' | 'cancelled';

/**
 * أمر الشراء - Purchase Order
 */
export interface PurchaseOrder {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  poNo: string;
  poDate: Date;
  supplierId: string;
  currencyCode: string;
  exchangeRate: number;
  expectedDate?: Date | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * أمر الشراء مع العلاقات - Purchase Order with Relations
 */
export interface PurchaseOrderWithRelations extends PurchaseOrder {
  supplier?: SupplierInfo;
  branch?: BranchInfo;
  warehouse?: WarehouseInfo;
  lines?: PurchaseOrderLineWithItem[];
}

/**
 * بند أمر الشراء - Purchase Order Line
 */
export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitId: string;
  unitPrice: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
}

/**
 * بند أمر الشراء مع الصنف - Purchase Order Line with Item
 */
export interface PurchaseOrderLineWithItem extends PurchaseOrderLine {
  item?: ItemInfo;
  unit?: UnitInfo;
}

// ============================================
// فواتير الشراء - Purchase Invoices
// ============================================

/**
 * حالة فاتورة الشراء
 */
export type PurchaseInvoiceStatus = 'draft' | 'posted' | 'partial' | 'paid' | 'cancelled';

/**
 * فاتورة الشراء - Purchase Invoice
 */
export interface PurchaseInvoice {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  invoiceNo: string;
  supplierInvoiceNo?: string | null;
  invoiceDate: Date;
  supplierId: string;
  purchaseOrderId?: string | null;
  currencyCode: string;
  exchangeRate: number;
  dueDate?: Date | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  otherCharges: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: PurchaseInvoiceStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  postedAt?: Date | null;
}

/**
 * فاتورة الشراء مع العلاقات - Purchase Invoice with Relations
 */
export interface PurchaseInvoiceWithRelations extends PurchaseInvoice {
  supplier?: SupplierInfo;
  branch?: BranchInfo;
  warehouse?: WarehouseInfo;
  purchaseOrder?: PurchaseOrderInfo;
  lines?: PurchaseInvoiceLineWithItem[];
}

/**
 * بند فاتورة الشراء - Purchase Invoice Line
 */
export interface PurchaseInvoiceLine {
  id: string;
  purchaseInvoiceId: string;
  itemId: string;
  description?: string | null;
  qty: number;
  unitId: string;
  unitFactor: number;
  baseQty: number;
  unitCost: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
  toBinId?: string | null;
}

/**
 * بند فاتورة الشراء مع الصنف - Purchase Invoice Line with Item
 */
export interface PurchaseInvoiceLineWithItem extends PurchaseInvoiceLine {
  item?: ItemInfo;
  unit?: UnitInfo;
  bin?: BinInfo;
}

// ============================================
// مردودات الشراء - Purchase Returns
// ============================================

/**
 * حالة مردود الشراء
 */
export type PurchaseReturnStatus = 'draft' | 'posted' | 'partial' | 'completed' | 'cancelled';

/**
 * مردود الشراء - Purchase Return
 */
export interface PurchaseReturn {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  returnNo: string;
  returnDate: Date;
  supplierId: string;
  originalInvoiceId?: string | null;
  purchaseOrderId?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: PurchaseReturnStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * مردود الشراء مع العلاقات - Purchase Return with Relations
 */
export interface PurchaseReturnWithRelations extends PurchaseReturn {
  supplier?: SupplierInfo;
  branch?: BranchInfo;
  warehouse?: WarehouseInfo;
  originalInvoice?: PurchaseInvoiceInfo;
  lines?: PurchaseReturnLineWithItem[];
}

/**
 * بند مردود الشراء - Purchase Return Line
 */
export interface PurchaseReturnLine {
  id: string;
  purchaseReturnId: string;
  itemId: string;
  originalLineId?: string | null;
  qty: number;
  unitId: string;
  unitFactor: number;
  baseQty: number;
  unitCost: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
  fromBinId?: string | null;
  returnReason?: string | null;
}

/**
 * بند مردود الشراء مع الصنف - Purchase Return Line with Item
 */
export interface PurchaseReturnLineWithItem extends PurchaseReturnLine {
  item?: ItemInfo;
  unit?: UnitInfo;
  bin?: BinInfo;
}

// ============================================
// أنواع الطلبات والاستجابات
// ============================================

/**
 * إنشاء أمر شراء جديد - Create Purchase Order Request
 */
export interface CreatePurchaseOrderRequest {
  branchId: string;
  warehouseId: string;
  supplierId: string;
  poDate?: Date;
  currencyCode?: string;
  exchangeRate?: number;
  expectedDate?: Date;
  notes?: string;
  lines: CreatePurchaseOrderLineRequest[];
}

/**
 * إنشاء بند أمر شراء - Create Purchase Order Line Request
 */
export interface CreatePurchaseOrderLineRequest {
  itemId: string;
  qtyOrdered: number;
  unitId: string;
  unitPrice: number;
  discountAmount?: number;
  taxCodeId?: string;
}

/**
 * تحديث أمر شراء - Update Purchase Order Request
 */
export interface UpdatePurchaseOrderRequest {
  supplierId?: string;
  poDate?: Date;
  currencyCode?: string;
  exchangeRate?: number;
  expectedDate?: Date;
  notes?: string;
  lines?: UpdatePurchaseOrderLineRequest[];
}

/**
 * تحديث بند أمر شراء - Update Purchase Order Line Request
 */
export interface UpdatePurchaseOrderLineRequest {
  id?: string;
  itemId: string;
  qtyOrdered: number;
  unitId: string;
  unitPrice: number;
  discountAmount?: number;
  taxCodeId?: string;
}

/**
 * إنشاء فاتورة شراء جديدة - Create Purchase Invoice Request
 */
export interface CreatePurchaseInvoiceRequest {
  branchId: string;
  warehouseId: string;
  supplierId: string;
  purchaseOrderId?: string;
  supplierInvoiceNo?: string;
  invoiceDate?: Date;
  currencyCode?: string;
  exchangeRate?: number;
  dueDate?: Date;
  notes?: string;
  lines: CreatePurchaseInvoiceLineRequest[];
}

/**
 * إنشاء بند فاتورة شراء - Create Purchase Invoice Line Request
 */
export interface CreatePurchaseInvoiceLineRequest {
  itemId: string;
  description?: string;
  qty: number;
  unitId: string;
  unitFactor?: number;
  unitCost: number;
  discountAmount?: number;
  taxCodeId?: string;
  toBinId?: string;
}

/**
 * تحديث فاتورة شراء - Update Purchase Invoice Request
 */
export interface UpdatePurchaseInvoiceRequest {
  supplierId?: string;
  purchaseOrderId?: string;
  supplierInvoiceNo?: string;
  invoiceDate?: Date;
  currencyCode?: string;
  exchangeRate?: number;
  dueDate?: Date;
  notes?: string;
  lines?: UpdatePurchaseInvoiceLineRequest[];
}

/**
 * تحديث بند فاتورة شراء - Update Purchase Invoice Line Request
 */
export interface UpdatePurchaseInvoiceLineRequest {
  id?: string;
  itemId: string;
  description?: string;
  qty: number;
  unitId: string;
  unitFactor?: number;
  unitCost: number;
  discountAmount?: number;
  taxCodeId?: string;
  toBinId?: string;
}

/**
 * إنشاء مردود شراء جديد - Create Purchase Return Request
 */
export interface CreatePurchaseReturnRequest {
  branchId: string;
  warehouseId: string;
  supplierId: string;
  originalInvoiceId?: string;
  purchaseOrderId?: string;
  returnDate?: Date;
  notes?: string;
  lines: CreatePurchaseReturnLineRequest[];
}

/**
 * إنشاء بند مردود شراء - Create Purchase Return Line Request
 */
export interface CreatePurchaseReturnLineRequest {
  itemId: string;
  originalLineId?: string;
  qty: number;
  unitId: string;
  unitFactor?: number;
  unitCost: number;
  discountAmount?: number;
  taxCodeId?: string;
  fromBinId?: string;
  returnReason?: string;
}

/**
 * تحديث مردود شراء - Update Purchase Return Request
 */
export interface UpdatePurchaseReturnRequest {
  supplierId?: string;
  originalInvoiceId?: string;
  purchaseOrderId?: string;
  returnDate?: Date;
  notes?: string;
  lines?: UpdatePurchaseReturnLineRequest[];
}

/**
 * تحديث بند مردود شراء - Update Purchase Return Line Request
 */
export interface UpdatePurchaseReturnLineRequest {
  id?: string;
  itemId: string;
  originalLineId?: string;
  qty: number;
  unitId: string;
  unitFactor?: number;
  unitCost: number;
  discountAmount?: number;
  taxCodeId?: string;
  fromBinId?: string;
  returnReason?: string;
}

// ============================================
// معايير البحث والتصفية
// ============================================

/**
 * معايير البحث في أوامر الشراء - Purchase Order Search Filters
 */
export interface PurchaseOrderSearchFilters {
  query?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  status?: PurchaseOrderStatus;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  expectedDateRange?: {
    from?: Date;
    to?: Date;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * معايير البحث في فواتير الشراء - Purchase Invoice Search Filters
 */
export interface PurchaseInvoiceSearchFilters {
  query?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  purchaseOrderId?: string;
  status?: PurchaseInvoiceStatus;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  dueDateRange?: {
    from?: Date;
    to?: Date;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
}

/**
 * معايير البحث في مردودات الشراء - Purchase Return Search Filters
 */
export interface PurchaseReturnSearchFilters {
  query?: string;
  supplierId?: string;
  branchId?: string;
  warehouseId?: string;
  originalInvoiceId?: string;
  purchaseOrderId?: string;
  status?: PurchaseReturnStatus;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * معايير القائمة - List Query
 */
export interface ListPurchasingQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'number' | 'amount' | 'supplier' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
  includeSupplier?: boolean;
  includeBranch?: boolean;
  includeWarehouse?: boolean;
  includeLines?: boolean;
}

// ============================================
// أنواع مساعدة
// ============================================

/**
 * معلومات المورد المختصرة - Supplier Info
 */
export interface SupplierInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  currencyCode: string;
  paymentTermsDays: number;
  currentBalance: number;
}

/**
 * معلومات الفرع المختصرة - Branch Info
 */
export interface BranchInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات المستودع المختصرة - Warehouse Info
 */
export interface WarehouseInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات الصنف المختصرة - Item Info
 */
export interface ItemInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  partNumber?: string;
  unitId: string;
}

/**
 * معلومات الوحدة المختصرة - Unit Info
 */
export interface UnitInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات الموقع المختصرة - Bin Info
 */
export interface BinInfo {
  id: string;
  fullCode: string;
}

/**
 * معلومات أمر الشراء المختصرة - Purchase Order Info
 */
export interface PurchaseOrderInfo {
  id: string;
  poNo: string;
  poDate: Date;
  totalAmount: number;
  status: PurchaseOrderStatus;
}

/**
 * معلومات فاتورة الشراء المختصرة - Purchase Invoice Info
 */
export interface PurchaseInvoiceInfo {
  id: string;
  invoiceNo: string;
  invoiceDate: Date;
  totalAmount: number;
  status: PurchaseInvoiceStatus;
}

// ============================================
// إحصائيات المشتريات
// ============================================

/**
 * إحصائيات أوامر الشراء - Purchase Order Statistics
 */
export interface PurchaseOrderStatistics {
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
}

/**
 * إحصائيات فواتير الشراء - Purchase Invoice Statistics
 */
export interface PurchaseInvoiceStatistics {
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
}

/**
 * إحصائيات مردودات الشراء - Purchase Return Statistics
 */
export interface PurchaseReturnStatistics {
  total: number;
  byStatus: Record<PurchaseReturnStatus, number>;
  totalAmount: number;
  avgReturnValue: number;
  topReasons: Array<{
    reason: string;
    count: number;
    totalAmount: number;
  }>;
}

// ============================================
// أنواع العمليات
// ============================================

/**
 * نتيجة اعتماد أمر الشراء - Approve Purchase Order Result
 */
export interface ApprovePurchaseOrderResult {
  success: boolean;
  purchaseOrderId: string;
  previousStatus: PurchaseOrderStatus;
  newStatus: PurchaseOrderStatus;
  approvedAt: Date;
}

/**
 * نتيجة استلام أمر الشراء - Receive Purchase Order Result
 */
export interface ReceivePurchaseOrderResult {
  success: boolean;
  purchaseOrderId: string;
  purchaseInvoiceId?: string;
  receivedItems: Array<{
    itemId: string;
    qtyReceived: number;
    previousQtyReceived: number;
    newQtyReceived: number;
  }>;
  status: PurchaseOrderStatus;
}

/**
 * نتيجة ترحيل الفاتورة - Post Invoice Result
 */
export interface PostInvoiceResult {
  success: boolean;
  purchaseInvoiceId: string;
  previousStatus: PurchaseInvoiceStatus;
  newStatus: PurchaseInvoiceStatus;
  postedAt: Date;
  journalEntryId?: string;
  stockUpdated: boolean;
}

/**
 * نتيجة ترحيل المردود - Post Return Result
 */
export interface PostReturnResult {
  success: boolean;
  purchaseReturnId: string;
  previousStatus: PurchaseReturnStatus;
  newStatus: PurchaseReturnStatus;
  postedAt: Date;
  journalEntryId?: string;
  stockUpdated: boolean;
}
