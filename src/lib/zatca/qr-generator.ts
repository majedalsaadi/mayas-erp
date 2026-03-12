/**
 * Mayas ERP - ZATCA QR Generator
 * مولد رمز QR للفواتير الإلكترونية
 * 
 * يتوافق مع مواصفات ZATCA TLV (Tag-Length-Value)
 */

import { createLogger } from '@/lib/logger';
import type { ZATCAQRData, QRCodeResult } from '@/types/tax';

const logger = createLogger('ZATCAQRGenerator');

// ============================================
// الثوابت
// ============================================

/**
 * علامات TLV المعتمدة من ZATCA
 */
const TLV_TAGS = {
  SELLER_NAME: 1,
  VAT_NUMBER: 2,
  TIMESTAMP: 3,
  INVOICE_TOTAL: 4,
  VAT_TOTAL: 5,
  INVOICE_HASH: 6,
  ECICS_SIGNATURE: 7,
} as const;

// ============================================
// وظائف TLV
// ============================================

/**
 * ترميز قيمة بصيغة TLV
 */
function encodeTLV(tag: number, value: string | number): Buffer {
  const valueBuffer = Buffer.from(String(value), 'utf-8');
  const length = valueBuffer.length;

  // التحقق من الحد الأقصى للطول (255 بايت)
  if (length > 255) {
    logger.warn('قيمة TLV تتجاوز الحد الأقصى', { tag, length });
    // قطع القيمة إذا كانت طويلة جداً
    return Buffer.concat([
      Buffer.from([tag]),
      Buffer.from([255]),
      valueBuffer.slice(0, 255),
    ]);
  }

  return Buffer.concat([
    Buffer.from([tag]),
    Buffer.from([length]),
    valueBuffer,
  ]);
}

/**
 * ترميز رقم بصيغة TLV (للمبالغ)
 */
function encodeNumberTLV(tag: number, value: number): Buffer {
  // تنسيق المبلغ إلى منزلتين عشريتين
  const formattedValue = value.toFixed(2);
  return encodeTLV(tag, formattedValue);
}

/**
 * فك ترميز TLV
 */
function decodeTLV(buffer: Buffer, offset: number): { tag: number; length: number; value: string; nextOffset: number } | null {
  if (offset >= buffer.length) {
    return null;
  }

  const tag = buffer[offset];
  const length = buffer[offset + 1];
  const value = buffer.slice(offset + 2, offset + 2 + length).toString('utf-8');
  const nextOffset = offset + 2 + length;

  return { tag, length, value, nextOffset };
}

/**
 * فك ترميز كامل لـ TLV
 */
function decodeAllTLV(base64String: string): Map<number, string> {
  const buffer = Buffer.from(base64String, 'base64');
  const result = new Map<number, string>();
  let offset = 0;

  while (offset < buffer.length) {
    const decoded = decodeTLV(buffer, offset);
    if (!decoded) break;
    
    result.set(decoded.tag, decoded.value);
    offset = decoded.nextOffset;
  }

  return result;
}

// ============================================
// توليد QR Code
// ============================================

/**
 * إنشاء بيانات QR بصيغة TLV
 */
export function generateQRData(data: ZATCAQRData): Buffer {
  logger.debug('إنشاء بيانات QR', { vatNumber: data.vatNumber });

  const tlvSegments: Buffer[] = [];

  // Tag 1: اسم البائع
  tlvSegments.push(encodeTLV(TLV_TAGS.SELLER_NAME, data.sellerName));

  // Tag 2: الرقم الضريبي
  tlvSegments.push(encodeTLV(TLV_TAGS.VAT_NUMBER, data.vatNumber));

  // Tag 3: التاريخ والوقت
  tlvSegments.push(encodeTLV(TLV_TAGS.TIMESTAMP, data.timestamp));

  // Tag 4: إجمالي الفاتورة شامل الضريبة
  tlvSegments.push(encodeNumberTLV(TLV_TAGS.INVOICE_TOTAL, data.totalWithVat));

  // Tag 5: إجمالي الضريبة
  tlvSegments.push(encodeNumberTLV(TLV_TAGS.VAT_TOTAL, data.vatAmount));

  // Tag 6: Hash الفاتورة (إن وجد)
  if (data.invoiceHash) {
    tlvSegments.push(encodeTLV(TLV_TAGS.INVOICE_HASH, data.invoiceHash));
  }

  // Tag 7: التوقيع الرقمي (إن وجد)
  if (data.ecicsSignature) {
    tlvSegments.push(encodeTLV(TLV_TAGS.ECICS_SIGNATURE, data.ecicsSignature));
  }

  return Buffer.concat(tlvSegments);
}

/**
 * إنشاء QR Code بصيغة Base64
 */
export function generateQRBase64(data: ZATCAQRData): string {
  const qrBuffer = generateQRData(data);
  return qrBuffer.toString('base64');
}

/**
 * إنشاء QR Code كامل مع التفاصيل
 */
export function generateQRCode(data: ZATCAQRData): QRCodeResult {
  const qrBuffer = generateQRData(data);
  const qrBase64 = qrBuffer.toString('base64');

  logger.info('تم إنشاء QR Code', { 
    vatNumber: data.vatNumber,
    totalWithVat: data.totalWithVat,
    vatAmount: data.vatAmount 
  });

  return {
    qrText: qrBase64,
    tlvTags: {
      tag1: data.sellerName,
      tag2: data.vatNumber,
      tag3: data.timestamp,
      tag4: data.totalWithVat.toFixed(2),
      tag5: data.vatAmount.toFixed(2),
      tag6: data.invoiceHash || '',
      tag7: data.ecicsSignature || '',
    },
  };
}

/**
 * إنشاء QR Code للفاتورة البسيطة (للفواتير المبسطة)
 * لا تتطلب توقيع رقمي
 */
export function generateSimpleQR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatAmount: number
): QRCodeResult {
  return generateQRCode({
    sellerName,
    vatNumber,
    timestamp,
    totalWithVat,
    vatAmount,
    invoiceHash: '',
    ecicsSignature: '',
  });
}

/**
 * إنشاء QR Code للفاتورة الضريبية (للفواتير الضريبية B2B)
 * تتطلب hash وتوقيع رقمي
 */
export function generateTaxInvoiceQR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatAmount: number,
  invoiceHash: string,
  ecicsSignature: string
): QRCodeResult {
  return generateQRCode({
    sellerName,
    vatNumber,
    timestamp,
    totalWithVat,
    vatAmount,
    invoiceHash,
    ecicsSignature,
  });
}

// ============================================
// فك تشفير QR Code
// ============================================

/**
 * فك تشفير QR Code
 */
export function decodeQRCode(base64String: string): ZATCAQRData | null {
  try {
    const tags = decodeAllTLV(base64String);

    const sellerName = tags.get(TLV_TAGS.SELLER_NAME);
    const vatNumber = tags.get(TLV_TAGS.VAT_NUMBER);
    const timestamp = tags.get(TLV_TAGS.TIMESTAMP);
    const totalWithVat = parseFloat(tags.get(TLV_TAGS.INVOICE_TOTAL) || '0');
    const vatAmount = parseFloat(tags.get(TLV_TAGS.VAT_TOTAL) || '0');
    const invoiceHash = tags.get(TLV_TAGS.INVOICE_HASH) || '';
    const ecicsSignature = tags.get(TLV_TAGS.ECICS_SIGNATURE) || '';

    if (!sellerName || !vatNumber || !timestamp) {
      logger.error('بيانات QR غير مكتملة');
      return null;
    }

    return {
      sellerName,
      vatNumber,
      timestamp,
      totalWithVat,
      vatAmount,
      invoiceHash,
      ecicsSignature,
    };
  } catch (error) {
    logger.error('خطأ في فك تشفير QR Code', error as Error);
    return null;
  }
}

/**
 * التحقق من صحة QR Code
 */
export function validateQRCode(base64String: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const tags = decodeAllTLV(base64String);

    // التحقق من العناصر المطلوبة
    if (!tags.has(TLV_TAGS.SELLER_NAME)) {
      errors.push('اسم البائع غير موجود');
    }
    if (!tags.has(TLV_TAGS.VAT_NUMBER)) {
      errors.push('الرقم الضريبي غير موجود');
    }
    if (!tags.has(TLV_TAGS.TIMESTAMP)) {
      errors.push('التاريخ والوقت غير موجود');
    }
    if (!tags.has(TLV_TAGS.INVOICE_TOTAL)) {
      errors.push('إجمالي الفاتورة غير موجود');
    }
    if (!tags.has(TLV_TAGS.VAT_TOTAL)) {
      errors.push('إجمالي الضريبة غير موجود');
    }

    // التحقق من الرقم الضريبي
    const vatNumber = tags.get(TLV_TAGS.VAT_NUMBER);
    if (vatNumber && !vatNumber.startsWith('3')) {
      errors.push('الرقم الضريبي يجب أن يبدأ بـ 3');
    }
    if (vatNumber && vatNumber.length !== 15) {
      errors.push('الرقم الضريبي يجب أن يتكون من 15 رقم');
    }

    // التحقق من القيم الرقمية
    const total = parseFloat(tags.get(TLV_TAGS.INVOICE_TOTAL) || '0');
    const vat = parseFloat(tags.get(TLV_TAGS.VAT_TOTAL) || '0');
    
    if (total < 0) {
      errors.push('إجمالي الفاتورة لا يمكن أن يكون سالب');
    }
    if (vat < 0) {
      errors.push('إجمالي الضريبة لا يمكن أن يكون سالب');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: ['خطأ في فك تشفير QR Code'],
    };
  }
}

// ============================================
// وظائف مساعدة
// ============================================

/**
 * تنسيق التاريخ والوقت لـ QR
 */
export function formatQRTimestamp(date: Date): string {
  // تنسيق: YYYY-MM-DDTHH:MM:SSZ
  const isoString = date.toISOString();
  return isoString.replace(/\.\d{3}Z$/, 'Z');
}

/**
 * إنشاء URL لـ QR Code (للعرض كصورة)
 */
export function generateQRCodeUrl(qrBase64: string): string {
  // يمكن استخدام مكتبة QR code مثل qrcode-generator
  // هذه دالة placeholder
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrBase64)}`;
}

/**
 * إنشاء Data URL لصورة QR
 */
export async function generateQRCodeDataUrl(qrBase64: string): Promise<string> {
  // هذه تحتاج إلى مكتبة QR code
  // نستخدم placeholder للآن
  return `data:text/plain;base64,${qrBase64}`;
}

/**
 * طباعة معلومات QR (للتشخيص)
 */
export function printQRInfo(qrBase64: string): void {
  const data = decodeQRCode(qrBase64);
  if (data) {
    console.log('=== معلومات QR Code ===');
    console.log(`اسم البائع: ${data.sellerName}`);
    console.log(`الرقم الضريبي: ${data.vatNumber}`);
    console.log(`التاريخ والوقت: ${data.timestamp}`);
    console.log(`إجمالي الفاتورة: ${data.totalWithVat}`);
    console.log(`إجمالي الضريبة: ${data.vatAmount}`);
    console.log(`Hash: ${data.invoiceHash || 'غير متوفر'}`);
    console.log(`التوقيع: ${data.ecicsSignature ? 'متوفر' : 'غير متوفر'}`);
    console.log('=====================');
  } else {
    console.log('فشل في فك تشفير QR Code');
  }
}

// تصدير افتراضي
export default {
  generateQRData,
  generateQRBase64,
  generateQRCode,
  generateSimpleQR,
  generateTaxInvoiceQR,
  decodeQRCode,
  validateQRCode,
  formatQRTimestamp,
  generateQRCodeUrl,
  generateQRCodeDataUrl,
  printQRInfo,
};
