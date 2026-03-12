/**
 * Mayas ERP - Feature Flags
 * ميزات النظام
 */

export const features = {
  // الميزات الأساسية
  core: {
    multiCompany: true,
    multiBranch: true,
    multiWarehouse: true,
    multiCurrency: true,
    multiLanguage: true,
  },

  // ميزات المخزون
  inventory: {
    serialTracking: true,
    batchTracking: true,
    barcodeScanning: true,
    stockAlerts: true,
    stockTransfers: true,
    stockAdjustments: true,
  },

  // ميزات المبيعات
  sales: {
    quotations: true,
    salesOrders: true,
    invoices: true,
    returns: true,
    recurringInvoices: false,
  },

  // ميزات المشتريات
  purchasing: {
    purchaseOrders: true,
    purchaseInvoices: true,
    purchaseReturns: true,
    supplierPortal: false,
  },

  // ميزات POS
  pos: {
    terminalMode: true,
    shiftManagement: true,
    cashDrawer: true,
    receiptPrinting: true,
    customerDisplay: false,
  },

  // ميزات المحاسبة
  accounting: {
    journalEntries: true,
    autoPosting: true,
    multiCurrency: true,
    budgets: false,
    costCenters: false,
    fixedAssets: false,
  },

  // ميزات الضرائب
  tax: {
    vat: true,
    withholdingTax: false,
    zatca: true,
    electronicInvoicing: true,
  },

  // ميزات AI
  ai: {
    chatbot: true,
    suggestions: true,
    reportAnalysis: false,
    demandForecasting: false,
  },

  // ميزات التقارير
  reports: {
    salesReports: true,
    inventoryReports: true,
    financialReports: true,
    customReports: false,
    scheduledReports: false,
  },

  // ميزات التكامل
  integrations: {
    salla: false,
    zid: false,
    shopify: false,
    paymentGateways: true,
    shippingProviders: false,
  },

  // ميزات الأمان
  security: {
    twoFactorAuth: false,
    auditLog: true,
    dataEncryption: true,
    backupRestore: false,
  },
} as const;

export type Features = typeof features;

/**
 * التحقق من تفعيل ميزة
 */
export function isFeatureEnabled(path: string): boolean {
  const parts = path.split('.');
  let current: any = features;

  for (const part of parts) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return current === true;
}
