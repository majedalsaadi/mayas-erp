/**
 * Mayas ERP - Constants
 * الثوابت الأساسية
 */

// ============================================
// الأنواع
// ============================================

export const ACCOUNT_TYPES = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE',
} as const;

export const ITEM_TYPES = {
  STOCK: 'stock',
  SERVICE: 'service',
  BUNDLE: 'bundle',
  NON_STOCK: 'non_stock',
} as const;

export const CUSTOMER_TYPES = {
  RETAIL: 'retail',
  WHOLESALE: 'wholesale',
  WORKSHOP: 'workshop',
  DISTRIBUTOR: 'distributor',
} as const;

export const WAREHOUSE_TYPES = {
  MAIN: 'main',
  BRANCH: 'branch',
  DAMAGED: 'damaged',
  QUARANTINE: 'quarantine',
} as const;

export const INVOICE_TYPES = {
  CASH: 'cash',
  CREDIT: 'credit',
  QUOTATION: 'quotation',
  ORDER: 'order',
  RETURN: 'return',
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  CHEQUE: 'cheque',
  CREDIT: 'credit',
} as const;

export const TRANSACTION_TYPES = {
  SALE: 'sale',
  PURCHASE: 'purchase',
  TRANSFER: 'transfer',
  ADJUSTMENT: 'adjustment',
  COUNT: 'count',
  RETURN: 'return',
} as const;

export const STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  POSTED: 'posted',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
} as const;

// ============================================
// الأدوار الافتراضية
// ============================================

export const DEFAULT_ROLES = {
  ADMIN: 'admin',
  BRANCH_MANAGER: 'branch_manager',
  ACCOUNTANT: 'accountant',
  CASHIER: 'cashier',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  SALES: 'sales',
  VIEWER: 'viewer',
} as const;

// ============================================
// الصلاحيات
// ============================================

export const PERMISSIONS = {
  // المبيعات
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT: 'sales.edit',
  SALES_DELETE: 'sales.delete',
  SALES_APPROVE: 'sales.approve',

  // المشتريات
  PURCHASING_VIEW: 'purchasing.view',
  PURCHASING_CREATE: 'purchasing.create',
  PURCHASING_EDIT: 'purchasing.edit',
  PURCHASING_APPROVE: 'purchasing.approve',

  // المخزون
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_COUNT: 'inventory.count',

  // المحاسبة
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_POST: 'accounting.post',
  ACCOUNTING_APPROVE: 'accounting.approve',
  ACCOUNTING_REPORTS: 'accounting.reports',
  ACCOUNTING_CLOSE: 'accounting.close',

  // POS
  POS_USE: 'pos.use',
  POS_OPEN_SHIFT: 'pos.open_shift',
  POS_CLOSE_SHIFT: 'pos.close_shift',
  POS_REFUND: 'pos.refund',

  // AI
  AI_USE: 'ai.use',
  AI_FINANCIALS: 'ai.financials',
  AI_ALL_BRANCHES: 'ai.all_branches',

  // الإعدادات
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  SETTINGS_USERS: 'settings.users',
} as const;

// ============================================
// حدود وقيم افتراضية
// ============================================

export const LIMITS = {
  MAX_ITEMS_PER_INVOICE: 100,
  MAX_INVOICE_AMOUNT: 10000000, // 10 مليون
  MAX_DISCOUNT_PERCENT: 100,
  MAX_CREDIT_LIMIT: 1000000, // 1 مليون
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_EXPORT_ROWS: 10000,
  PAGE_SIZE_DEFAULT: 20,
  PAGE_SIZE_MAX: 100,
} as const;

export const DEFAULTS = {
  CURRENCY: 'SAR',
  LANGUAGE: 'ar',
  TIMEZONE: 'Asia/Riyadh',
  TAX_RATE: 15, // 15% VAT
  CREDIT_DAYS: 30,
  FISCAL_YEAR_START: 1, // January
  DECIMAL_PLACES: 4,
  PRICE_DECIMALS: 2,
  QTY_DECIMALS: 4,
} as const;

// ============================================
// رسائل الخطأ
// ============================================

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'هذا الحقل مطلوب',
  INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
  INVALID_PHONE: 'رقم الجوال غير صحيح',
  INVALID_DATE: 'التاريخ غير صحيح',
  INVALID_NUMBER: 'الرقم غير صحيح',
  MIN_VALUE: (min: number) => `الحد الأدنى هو ${min}`,
  MAX_VALUE: (max: number) => `الحد الأقصى هو ${max}`,
  MIN_LENGTH: (min: number) => `الحد الأدنى ${min} أحرف`,
  MAX_LENGTH: (max: number) => `الحد الأقصى ${max} حرف`,
  UNIQUE_VIOLATION: 'هذه القيمة موجودة مسبقاً',
  FOREIGN_KEY_VIOLATION: 'لا يمكن الحذف - البيانات مستخدمة',
  UNAUTHORIZED: 'غير مصرح لك بالوصول',
  FORBIDDEN: 'الوصول ممنوع',
  NOT_FOUND: 'البيانات غير موجودة',
  INTERNAL_ERROR: 'خطأ داخلي - يرجى المحاولة لاحقاً',
} as const;

// ============================================
// رسائل النجاح
// ============================================

export const SUCCESS_MESSAGES = {
  CREATED: 'تم الإنشاء بنجاح',
  UPDATED: 'تم التحديث بنجاح',
  DELETED: 'تم الحذف بنجاح',
  SAVED: 'تم الحفظ بنجاح',
  SENT: 'تم الإرسال بنجاح',
  APPROVED: 'تم الاعتماد بنجاح',
  POSTED: 'تم الترحيل بنجاح',
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
} as const;

// ============================================
// أنماط التحقق
// ============================================

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_SA: /^(\+966|966|0)?5\d{8}$/,
  TAX_NUMBER_SA: /^3\d{14}$/,
  COMMERCIAL_REG: /^\d{10}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  BARCODE: /^[a-zA-Z0-9-]+$/,
  CODE: /^[A-Z0-9_-]{2,20}$/,
} as const;

// ============================================
// ألوان الحالات
// ============================================

export const STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'blue',
  posted: 'green',
  cancelled: 'red',
  closed: 'purple',
} as const;

// ============================================
// أولويات التنبيهات
// ============================================

export const ALERT_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
