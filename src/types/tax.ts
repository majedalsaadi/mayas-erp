/**
 * Mayas ERP - Tax & ZATCA Types
 * أنواع الضرائب والتكامل مع هيئة الزكاة والضريبة
 */

import { z } from 'zod';

// ============================================
// أنواع أكواد الضريبة
// ============================================

/**
 * نوع الضريبة
 */
export type TaxType = 'vat' | 'excise' | 'withholding' | 'other';

/**
 * فئة ZATCA للفاتورة
 */
export type ZATCACategory = 
  | 'STANDARD' // ضريبة قياسية 15%
  | 'ZERO_RATE' // معدل صفر
  | 'EXEMPT' // معفاة
  | 'OUT_OF_SCOPE' // خارج النطاق
  | 'REVERSE_CHARGE'; // آلية العكس

/**
 * نوع الفاتورة في ZATCA
 */
export type ZATCAInvoiceType = 
  | 'invoice' // فاتورة ضريبية
  | 'debit_note' // إشعار مدين
  | 'credit_note' // إشعار دائن
  | 'prepayment'; // سداد مقدم

/**
 * حالة إرسال ZATCA
 */
export type ZATCASubmissionStatus = 
  | 'pending' // قيد الانتظار
  | 'submitted' // تم الإرسال
  | 'reported' // تم التبليغ
  | 'cleared' // تمت الموافقة
  | 'rejected' // مرفوض
  | 'error'; // خطأ

// ============================================
// واجهات أكواد الضريبة
// ============================================

/**
 * كود الضريبة
 */
export interface TaxCode {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rate: number;
  taxType: TaxType;
  zatcaCategory?: ZATCACategory;
  isDefaultSales: boolean;
  isDefaultPurchase: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * كود ضريبة مع تفاصيل إضافية
 */
export interface TaxCodeWithDetails extends TaxCode {
  _count?: {
    items: number;
  };
}

// ============================================
// حساب الضريبة
// ============================================

/**
 * تفاصيل حساب الضريبة للبند
 */
export interface TaxLineCalculation {
  taxCodeId: string;
  taxCode?: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  zatcaCategory: ZATCACategory;
}

/**
 * نتيجة حساب الضريبة
 */
export interface TaxCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxLines: TaxLineCalculation[];
  totalTaxAmount: number;
  totalWithTax: number;
  taxExclusiveAmount: number;
  taxInclusiveAmount: number;
}

/**
 * معلومات الضريبة للفاتورة
 */
export interface InvoiceTaxSummary {
  taxCodeId: string;
  taxCode: string;
  taxNameAr: string;
  taxNameEn: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  zatcaCategory: ZATCACategory;
}

// ============================================
// ZATCA - الفواتير الإلكترونية
// ============================================

/**
 * معلومات البائع لـ ZATCA
 */
export interface ZATCASellerInfo {
  vatNumber: string; // الرقم الضريبي
  nameAr: string;
  nameEn?: string;
  streetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivision?: string;
  city?: string;
  postalZone?: string;
  countryCode: string; // SA
}

/**
 * معلومات المشتري لـ ZATCA
 */
export interface ZATCABuyerInfo {
  vatNumber?: string;
  nameAr: string;
  nameEn?: string;
  streetName?: string;
  buildingNumber?: string;
  citySubdivision?: string;
  city?: string;
  postalZone?: string;
  countryCode: string;
}

/**
 * بند فاتورة ZATCA
 */
export interface ZATCAInvoiceLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn?: string;
  quantity: number;
  unitCode: string; // ISO code
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  taxCodeId: string;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  zatcaCategory: ZATCACategory;
}

/**
 * فاتورة ZATCA
 */
export interface ZATCAInvoice {
  uuid: string;
  invoiceNumber: string;
  invoiceType: ZATCAInvoiceType;
  invoiceDate: string; // ISO format
  invoiceTime: string; // ISO format
  seller: ZATCASellerInfo;
  buyer: ZATCABuyerInfo;
  lines: ZATCAInvoiceLine[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  currencyCode: string;
  paymentMethod?: string;
  previousInvoiceHash?: string;
}

/**
 * مستند ZATCA
 */
export interface ZATCADocument {
  id: string;
  companyId: string;
  branchId: string;
  sourceType: 'sales_invoice' | 'sales_return' | 'purchase_invoice';
  sourceId: string;
  uuid: string;
  invoiceHash?: string;
  qrCodeText?: string;
  xmlFileId?: string;
  pdfFileId?: string;
  submissionStatus?: ZATCASubmissionStatus;
  clearedAt?: Date;
  reportedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * سجل ZATCA
 */
export interface ZATCALog {
  id: string;
  zatcaDocumentId: string;
  actionType: 'report' | 'clear' | 'status_check';
  requestPayload?: string;
  responsePayload?: string;
  statusCode?: string;
  createdAt: Date;
}

// ============================================
// ZATCA QR Code
// ============================================

/**
 * بيانات QR Code لـ ZATCA (TLV format)
 */
export interface ZATCAQRData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: number;
  vatAmount: number;
  invoiceHash: string;
  ecicsSignature: string;
}

/**
 * نتيجة إنشاء QR Code
 */
export interface QRCodeResult {
  qrText: string; // Base64 encoded TLV
  qrDataUrl?: string; // Data URL for image
  tlvTags: {
    tag1: string; // Seller Name
    tag2: string; // VAT Number
    tag3: string; // Timestamp
    tag4: string; // Invoice Total
    tag5: string; // VAT Total
    tag6: string; // Invoice Hash
    tag7: string; // ECICS Signature
  };
}

// ============================================
// ZATCA API Response
// ============================================

/**
 * استجابة ZATCA
 */
export interface ZATCAResponse {
  success: boolean;
  submissionUUID?: string;
  invoiceHash?: string;
  qrCode?: string;
  clearedInvoice?: string; // Signed XML
  reportingStatus?: string;
  clearanceStatus?: string;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

/**
 * نتيجة إرسال الفاتورة
 */
export interface ZATCASubmissionResult {
  success: boolean;
  documentId?: string;
  submissionStatus: ZATCASubmissionStatus;
  invoiceHash?: string;
  qrCode?: string;
  clearedInvoice?: string;
  rejectionReason?: string;
}

// ============================================
// ZATCA Configuration
// ============================================

/**
 * إعدادات ZATCA
 */
export interface ZATCAConfig {
  environment: 'sandbox' | 'production';
  apiBaseUrl: string;
  ccsid: string; // Compliance CSID
  csid: string; // Production CSID
  secret: string;
  vatNumber: string;
  sellerName: string;
}

// ============================================
// Zod Schemas
// ============================================

export const taxCodeSchema = z.object({
  code: z.string().min(1).max(20),
  nameAr: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(100),
  rate: z.number().min(0).max(100),
  taxType: z.enum(['vat', 'excise', 'withholding', 'other']).default('vat'),
  zatcaCategory: z.enum(['STANDARD', 'ZERO_RATE', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE']).optional(),
  isDefaultSales: z.boolean().default(false),
  isDefaultPurchase: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const taxCalculationSchema = z.object({
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  taxCodeId: z.string().uuid(),
  taxInclusive: z.boolean().default(false),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number().min(0),
});

export const zatcaInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceType: z.enum(['invoice', 'debit_note', 'credit_note', 'prepayment']),
  invoiceDate: z.string(),
  invoiceTime: z.string(),
  seller: z.object({
    vatNumber: z.string().regex(/^3\d{14}$/, 'الرقم الضريبي غير صحيح'),
    nameAr: z.string(),
    nameEn: z.string().optional(),
    countryCode: z.string().length(2),
  }),
  buyer: z.object({
    vatNumber: z.string().optional(),
    nameAr: z.string(),
    countryCode: z.string().length(2),
  }),
  lines: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().min(0),
    unitCode: z.string(),
    unitPrice: z.number().min(0),
    taxCodeId: z.string(),
    zatcaCategory: z.enum(['STANDARD', 'ZERO_RATE', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE']),
  })).min(1),
});

export const zatcaSubmissionSchema = z.object({
  sourceType: z.enum(['sales_invoice', 'sales_return', 'purchase_invoice']),
  sourceId: z.string().uuid(),
  submitToZatca: z.boolean().default(true),
});

// ============================================
// Constants
// ============================================

/**
 * أكواد الوحدات المعتمدة من ZATCA (UN/ECE)
 */
export const ZATCA_UNIT_CODES: Record<string, string> = {
  'قطعة': 'PCE',
  'كجم': 'KGM',
  'متر': 'MTR',
  'لتر': 'LTR',
  'علبة': 'BOX',
  'كرتون': 'CT',
  'طن': 'TNE',
  'جرام': 'GRM',
  'ساعة': 'HUR',
  'يوم': 'DAY',
};

/**
 * معدلات الضريبة الافتراضية في السعودية
 */
export const DEFAULT_TAX_RATES = {
  VAT_STANDARD: 15, // ضريبة القيمة المضافة القياسية
  VAT_ZERO: 0, // معدل صفر
  WITHHOLDING_5: 5, // خصم و توريد 5%
  WITHHOLDING_7: 7, // خصم و توريد 7%
} as const;

/**
 * أنواع الفواتير ZATCA
 */
export const ZATCA_INVOICE_TYPE_CODES: Record<ZATCAInvoiceType, string> = {
  invoice: '388',
  debit_note: '384',
  credit_note: '381',
  prepayment: '386',
} as const;

/**
 * أكواد فئات الضريبة ZATCA
 */
export const ZATCA_TAX_CATEGORY_CODES: Record<ZATCACategory, string> = {
  STANDARD: 'S',
  ZERO_RATE: 'Z',
  EXEMPT: 'E',
  OUT_OF_SCOPE: 'O',
  REVERSE_CHARGE: 'AE',
} as const;
