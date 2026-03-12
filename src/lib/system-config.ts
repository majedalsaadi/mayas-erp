/**
 * Mayas ERP - System Configuration
 * إعدادات النظام
 */

export const systemConfig = {
  // معلومات التطبيق
  app: {
    name: 'منصة مياس للمحاسبة',
    nameEn: 'Mayas Accounting Platform',
    version: '0.1.0',
    description: 'نظام ERP متكامل لقطاع قطع غيار السيارات',
    defaultLanguage: 'ar',
    defaultTimezone: 'Asia/Riyadh',
    defaultCurrency: 'SAR',
  },

  // إعدادات قاعدة البيانات
  database: {
    maxConnections: 20,
    connectionTimeout: 10000,
    queryTimeout: 30000,
  },

  // إعدادات الجلسات
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
    secretLength: 32,
    cookieName: 'mayas_session',
  },

  // إعدادات الضرائب
  tax: {
    vatRate: 0.15, // 15%
    vatCode: 'S',
    zatcaEnabled: false,
    zatcaSandbox: true,
  },

  // إعدادات المخزون
  inventory: {
    lowStockThreshold: 10,
    negativeStockAllowed: false,
    trackSerialNumbers: true,
    trackBatches: true,
  },

  // إعدادات المبيعات
  sales: {
    defaultPaymentTerms: 30, // 30 يوم
    maxDiscountPercent: 20,
    requireCustomerForInvoice: false,
    autoGenerateInvoiceNumber: true,
  },

  // إعدادات المشتريات
  purchasing: {
    requireApprovalForOrders: true,
    approvalThreshold: 10000, // 10,000 ريال
    autoCreateReceipt: true,
  },

  // إعدادات POS
  pos: {
    requireShiftOpen: true,
    allowNegativePayment: false,
    autoPrintReceipt: true,
    receiptCopies: 2,
  },

  // إعدادات AI
  ai: {
    enabled: true,
    provider: 'openrouter',
    defaultModel: 'anthropic/claude-3-sonnet',
    maxTokens: 4096,
    temperature: 0.7,
  },

  // إعدادات التخزين
  storage: {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'csv'],
    buckets: {
      itemImages: 'item-images',
      invoicePdfs: 'invoice-pdfs',
      zatcaXml: 'zatca-xml',
      attachments: 'attachments',
    },
  },

  // إعدادات التقارير
  reports: {
    defaultFormat: 'pdf',
    pageSize: 'A4',
    orientation: 'portrait',
    includeLogo: true,
  },

  // إعدادات الأمان
  security: {
    bcryptRounds: 12,
    jwtExpiry: '7d',
    rateLimitWindow: 15 * 60 * 1000, // 15 دقيقة
    rateLimitMax: 100, // 100 طلب
    corsOrigins: ['http://localhost:3000'],
  },

  // إعدادات التسجيل
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    format: 'json',
    includeTimestamp: true,
  },
} as const;

export type SystemConfig = typeof systemConfig;
