/**
 * Mayas ERP - Sales Types
 * أنواع TypeScript للمبيعات
 */

// ============================================
// أنواع الفواتير
// ============================================

/**
 * نوع الفاتورة
 */
export type InvoiceType = 'credit' | 'cash' | 'debit';

/**
 * نوع الفاتورة الفرعي
 */
export type InvoiceSubtype = 'standard' | 'simplified' | 'electronic';

/**
 * حالة الفاتورة
 */
export type InvoiceStatus = 'draft' | 'confirmed' | 'cancelled' | 'posted';

/**
 * حالة الدفع
 */
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

/**
 * طريقة الدفع
 */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque' | 'credit';

/**
 * فاتورة المبيعات - Sales Invoice
 */
export interface SalesInvoice {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  posTerminalId?: string | null;
  invoiceNo: string;
  invoiceDate: Date;
  invoiceType: InvoiceType;
  invoiceSubtype?: InvoiceSubtype | null;
  customerId: string;
  salesOrderId?: string | null;
  cashierUserId?: string | null;
  salespersonId?: string | null;
  currencyCode: string;
  exchangeRate: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  dueDate?: Date | null;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  roundAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  costTotal: number;
  grossProfit: number;
  status: InvoiceStatus;
  printedCount: number;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  postedAt?: Date | null;
}

/**
 * بند فاتورة المبيعات - Sales Invoice Line
 */
export interface SalesInvoiceLine {
  id: string;
  salesInvoiceId: string;
  itemId: string;
  description?: string | null;
  qty: number;
  unitId: string;
  unitFactor: number;
  baseQty: number;
  unitPrice: number;
  cost: number;
  discountPercent: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
  fromBinId?: string | null;
  isManualPrice: boolean;
  notes?: string | null;
}

/**
 * فاتورة المبيعات مع العلاقات
 */
export interface SalesInvoiceWithRelations extends SalesInvoice {
  lines?: SalesInvoiceLineWithRelations[];
  payments?: SalesPayment[];
  customer?: CustomerInfo;
  branch?: BranchInfo;
  warehouse?: WarehouseInfo;
}

/**
 * بند فاتورة مع العلاقات
 */
export interface SalesInvoiceLineWithRelations extends SalesInvoiceLine {
  item?: ItemInfo;
  unit?: UnitInfo;
  taxCode?: TaxCodeInfo;
}

// ============================================
// أنواع عروض الأسعار
// ============================================

/**
 * حالة عرض السعر
 */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

/**
 * عرض سعر المبيعات - Sales Quote
 */
export interface SalesQuote {
  id: string;
  companyId: string;
  branchId: string;
  quoteNo: string;
  quoteDate: Date;
  customerId: string;
  currencyCode: string;
  priceTierId?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: Date | null;
  status: QuoteStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * بند عرض السعر - Sales Quote Line
 */
export interface SalesQuoteLine {
  id: string;
  salesQuoteId: string;
  itemId: string;
  description?: string | null;
  qty: number;
  unitId: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
}

/**
 * عرض السعر مع العلاقات
 */
export interface SalesQuoteWithRelations extends SalesQuote {
  lines?: SalesQuoteLineWithRelations[];
  customer?: CustomerInfo;
}

/**
 * بند عرض السعر مع العلاقات
 */
export interface SalesQuoteLineWithRelations extends SalesQuoteLine {
  item?: ItemInfo;
  unit?: UnitInfo;
}

// ============================================
// أنواع أوامر المبيعات
// ============================================

/**
 * حالة أمر المبيعات
 */
export type SalesOrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'invoiced' | 'cancelled';

/**
 * أمر المبيعات - Sales Order
 */
export interface SalesOrder {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  orderNo: string;
  orderDate: Date;
  customerId: string;
  quoteId?: string | null;
  currencyCode: string;
  priceTierId?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: SalesOrderStatus;
  expectedShipDate?: Date | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * بند أمر المبيعات - Sales Order Line
 */
export interface SalesOrderLine {
  id: string;
  salesOrderId: string;
  itemId: string;
  description?: string | null;
  qtyOrdered: number;
  qtyShipped: number;
  qtyInvoiced: number;
  unitId: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
}

// ============================================
// أنواع المرتجعات
// ============================================

/**
 * حالة المرتجع
 */
export type ReturnStatus = 'draft' | 'confirmed' | 'cancelled';

/**
 * طريقة الاسترداد
 */
export type RefundMethod = 'cash' | 'credit' | 'store_credit' | 'exchange';

/**
 * سبب المرتجع
 */
export type ReturnReason = 'defective' | 'wrong_item' | 'not_as_described' | 'customer_change' | 'other';

/**
 * مرتجع المبيعات - Sales Return
 */
export interface SalesReturn {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  returnNo: string;
  returnDate: Date;
  customerId: string;
  originalInvoiceId?: string | null;
  refundMethod?: RefundMethod | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: ReturnStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * بند مرتجع المبيعات - Sales Return Line
 */
export interface SalesReturnLine {
  id: string;
  salesReturnId: string;
  itemId: string;
  originalLineId?: string | null;
  qty: number;
  unitId: string;
  unitPrice: number;
  cost: number;
  discountAmount: number;
  taxCodeId?: string | null;
  taxAmount: number;
  lineTotal: number;
  toBinId?: string | null;
  returnReason?: ReturnReason | null;
}

/**
 * مرتجع المبيعات مع العلاقات
 */
export interface SalesReturnWithRelations extends SalesReturn {
  lines?: SalesReturnLineWithRelations[];
  customer?: CustomerInfo;
  originalInvoice?: SalesInvoice;
}

/**
 * بند مرتجع مع العلاقات
 */
export interface SalesReturnLineWithRelations extends SalesReturnLine {
  item?: ItemInfo;
  unit?: UnitInfo;
}

// ============================================
// أنواع الدفعات
// ============================================

/**
 * دفعة المبيعات - Sales Payment
 */
export interface SalesPayment {
  id: string;
  companyId: string;
  branchId: string;
  salesInvoiceId: string;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  amount: number;
  cashboxId?: string | null;
  bankAccountId?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
}

// ============================================
// أنواع POS
// ============================================

/**
 * حالة الوردية
 */
export type ShiftStatus = 'open' | 'closed' | 'suspended';

/**
 * نوع حركة الصندوق
 */
export type MovementType = 'open' | 'sale' | 'refund' | 'cash_in' | 'cash_out' | 'close';

/**
 * محطة POS - POS Terminal
 */
export interface POSTerminal {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  cashboxId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  receiptPrinter?: string | null;
  barcodeScanner?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * وردية POS - POS Shift
 */
export interface POSShift {
  id: string;
  terminalId: string;
  userId: string;
  shiftNo: string;
  openedAt: Date;
  openingCash: number;
  closedAt?: Date | null;
  expectedCash?: number | null;
  actualCash?: number | null;
  cashDifference?: number | null;
  status: ShiftStatus;
  notes?: string | null;
}

/**
 * حركة وردية POS - POS Shift Movement
 */
export interface POSShiftMovement {
  id: string;
  shiftId: string;
  movementType: MovementType;
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: Date;
}

/**
 * وردية POS مع العلاقات
 */
export interface POSShiftWithRelations extends POSShift {
  terminal?: POSTerminal;
  movements?: POSShiftMovement[];
  user?: UserInfo;
}

// ============================================
// أنواع الطلبات والاستجابات
// ============================================

/**
 * طلب إنشاء فاتورة مبيعات
 */
export interface CreateSalesInvoiceRequest {
  branchId: string;
  warehouseId: string;
  customerId: string;
  posTerminalId?: string;
  invoiceType?: InvoiceType;
  invoiceSubtype?: InvoiceSubtype;
  currencyCode?: string;
  exchangeRate?: number;
  paymentMethod?: PaymentMethod;
  dueDate?: Date;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  lines: CreateSalesInvoiceLineInput[];
  payments?: CreateSalesPaymentInput[];
}

/**
 * بند فاتورة جديد
 */
export interface CreateSalesInvoiceLineInput {
  itemId: string;
  description?: string;
  qty: number;
  unitId: string;
  unitFactor?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCodeId?: string;
  fromBinId?: string;
  isManualPrice?: boolean;
  notes?: string;
}

/**
 * دفعة جديدة
 */
export interface CreateSalesPaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  cashboxId?: string;
  bankAccountId?: string;
  referenceNo?: string;
  notes?: string;
}

/**
 * طلب إنشاء عرض سعر
 */
export interface CreateSalesQuoteRequest {
  branchId: string;
  customerId: string;
  currencyCode?: string;
  priceTierId?: string;
  validUntil?: Date;
  discountAmount?: number;
  notes?: string;
  lines: CreateSalesQuoteLineInput[];
}

/**
 * بند عرض سعر جديد
 */
export interface CreateSalesQuoteLineInput {
  itemId: string;
  description?: string;
  qty: number;
  unitId: string;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCodeId?: string;
}

/**
 * طلب إنشاء أمر مبيعات
 */
export interface CreateSalesOrderRequest {
  branchId: string;
  warehouseId: string;
  customerId: string;
  quoteId?: string;
  currencyCode?: string;
  priceTierId?: string;
  expectedShipDate?: Date;
  discountAmount?: number;
  notes?: string;
  lines: CreateSalesOrderLineInput[];
}

/**
 * بند أمر مبيعات جديد
 */
export interface CreateSalesOrderLineInput {
  itemId: string;
  description?: string;
  qtyOrdered: number;
  unitId: string;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCodeId?: string;
}

/**
 * طلب إنشاء مرتجع
 */
export interface CreateSalesReturnRequest {
  branchId: string;
  warehouseId: string;
  customerId: string;
  originalInvoiceId?: string;
  refundMethod?: RefundMethod;
  notes?: string;
  lines: CreateSalesReturnLineInput[];
}

/**
 * بند مرتجع جديد
 */
export interface CreateSalesReturnLineInput {
  itemId: string;
  originalLineId?: string;
  qty: number;
  unitId: string;
  unitPrice: number;
  cost?: number;
  discountAmount?: number;
  taxCodeId?: string;
  toBinId?: string;
  returnReason?: ReturnReason;
}

/**
 * معايير البحث في الفواتير
 */
export interface SalesInvoiceSearchFilters {
  query?: string;
  customerId?: string;
  branchId?: string;
  warehouseId?: string;
  invoiceType?: InvoiceType;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
}

/**
 * معايير القائمة
 */
export interface ListSalesInvoicesQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'invoiceNo' | 'invoiceDate' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeCustomer?: boolean;
  includeLines?: boolean;
  filters?: SalesInvoiceSearchFilters;
}

/**
 * نتيجة القائمة المُصفّاة
 */
export interface PaginatedSalesInvoicesResult {
  invoices: SalesInvoiceWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * طلب فتح وردية
 */
export interface OpenShiftRequest {
  terminalId: string;
  userId: string;
  openingCash: number;
  notes?: string;
}

/**
 * طلب إغلاق وردية
 */
export interface CloseShiftRequest {
  shiftId: string;
  actualCash: number;
  notes?: string;
}

/**
 * طلب إضافة حركة صندوق
 */
export interface AddShiftMovementRequest {
  shiftId: string;
  movementType: 'cash_in' | 'cash_out';
  amount: number;
  notes?: string;
}

// ============================================
// أنواع معلومات مختصرة
// ============================================

/**
 * معلومات العميل المختصرة
 */
export interface CustomerInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone?: string | null;
  taxNumber?: string | null;
}

/**
 * معلومات الصنف المختصرة
 */
export interface ItemInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  unitId: string;
}

/**
 * معلومات الوحدة المختصرة
 */
export interface UnitInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات الفرع المختصرة
 */
export interface BranchInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات المستودع المختصرة
 */
export interface WarehouseInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/**
 * معلومات كود الضريبة المختصرة
 */
export interface TaxCodeInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rate: number;
}

/**
 * معلومات المستخدم المختصرة
 */
export interface UserInfo {
  id: string;
  username: string;
  fullName: string;
}

// ============================================
// أنواع Zod للتحقق
// ============================================

/**
 * مخطط التحقق من بند فاتورة
 */
export const SalesInvoiceLineSchema = {
  itemId: { type: 'string', required: true },
  qty: { type: 'number', min: 0.0001 },
  unitId: { type: 'string', required: true },
  unitPrice: { type: 'number', min: 0 },
  discountPercent: { type: 'number', min: 0, max: 100 },
  discountAmount: { type: 'number', min: 0 },
};

/**
 * مخطط التحقق من دفعة
 */
export const SalesPaymentSchema = {
  paymentMethod: { type: 'string', enum: ['cash', 'card', 'transfer', 'cheque', 'credit'] },
  amount: { type: 'number', min: 0.01 },
};

// ============================================
// أنواع إحصائيات المبيعات
// ============================================

/**
 * إحصائيات المبيعات
 */
export interface SalesStatistics {
  totalInvoices: number;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  averageInvoiceValue: number;
  invoicesByStatus: Record<InvoiceStatus, number>;
  invoicesByPaymentStatus: Record<PaymentStatus, number>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalAmount: number;
    invoiceCount: number;
  }>;
  topItems: Array<{
    itemId: string;
    itemName: string;
    qtySold: number;
    totalAmount: number;
  }>;
}

/**
 * ملخص POS
 */
export interface POSSummary {
  shiftId: string;
  terminalName: string;
  openedAt: Date;
  totalSales: number;
  totalRefunds: number;
  totalCashIn: number;
  totalCashOut: number;
  transactionCount: number;
  paymentsByMethod: Record<PaymentMethod, number>;
}
