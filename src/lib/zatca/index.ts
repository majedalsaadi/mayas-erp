/**
 * Mayas ERP - ZATCA Integration
 * التكامل مع هيئة الزكاة والضريبة والجمارك
 */

// XML Generator
export {
  generateInvoiceXml,
  generateInvoiceXmlBase64,
  calculateInvoiceHash,
  validateInvoiceXml,
} from './xml-generator';

// QR Generator
export {
  generateQRData,
  generateQRBase64,
  generateQRCode,
  generateSimpleQR,
  generateTaxInvoiceQR,
  decodeQRCode,
  validateQRCode,
  formatQRTimestamp,
} from './qr-generator';

// Submitter
export {
  reportInvoice,
  clearInvoice,
  checkInvoiceStatus,
  validateZATCAConfig,
  testZATCAConnection,
  resubmitInvoice,
} from './submitter';

// Re-export types
export type {
  ZATCAInvoice,
  ZATCAInvoiceLine,
  ZATCAInvoiceType,
  ZATCACategory,
  ZATCASubmissionStatus,
  ZATCADocument,
  ZATCALog,
  ZATCAResponse,
  ZATCASubmissionResult,
  ZATCAQRData,
  QRCodeResult,
  ZATCAConfig,
} from '@/types/tax';
