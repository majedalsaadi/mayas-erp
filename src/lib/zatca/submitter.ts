/**
 * Mayas ERP - ZATCA Submitter
 * مرسل الفواتير إلى هيئة الزكاة والضريبة والجمارك
 * 
 * يتولى إرسال الفواتير الإلكترونية إلى ZATCA للموافقة
 */

import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { 
  ZATCAInvoice, 
  ZATCASubmissionResult, 
  ZATCASubmissionStatus,
  ZATCAResponse,
  ZATCAConfig,
} from '@/types/tax';
import { generateInvoiceXml, calculateInvoiceHash } from './xml-generator';
import { generateQRBase64 } from './qr-generator';

const logger = createLogger('ZATCASubmitter');

// ============================================
// الإعدادات
// ============================================

/**
 * عناوين API لـ ZATCA
 */
const ZATCA_ENDPOINTS = {
  sandbox: {
    reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/',
    clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/',
    compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/',
  },
  production: {
    reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/invoices/reporting/',
    clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/invoices/clearance/',
    compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/compliance/',
  },
} as const;

/**
 * الحصول على إعدادات ZATCA من البيئة
 */
function getZATCAConfig(): ZATCAConfig {
  const environment = (process.env.ZATCA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  
  return {
    environment,
    apiBaseUrl: environment === 'production' 
      ? ZATCA_ENDPOINTS.production.reporting
      : ZATCA_ENDPOINTS.sandbox.reporting,
    ccsid: process.env.ZATCA_CCSID || '',
    csid: process.env.ZATCA_CSID || '',
    secret: process.env.ZATCA_SECRET || '',
    vatNumber: process.env.ZATCA_VAT_NUMBER || '',
    sellerName: process.env.ZATCA_SELLER_NAME || '',
  };
}

// ============================================
// إرسال الفواتير
// ============================================

/**
 * إرسال فاتورة للتقرير (Reporting)
 * تستخدم للفواتير البسيطة B2C
 */
export async function reportInvoice(
  invoice: ZATCAInvoice,
  companyId: string
): Promise<ZATCASubmissionResult> {
  const config = getZATCAConfig();
  
  logger.info('إرسال فاتورة للتقرير', { 
    invoiceNumber: invoice.invoiceNumber,
    companyId 
  });

  try {
    // توليد XML
    const xml = generateInvoiceXml(invoice);
    const invoiceHash = calculateInvoiceHash(xml);

    // توليد QR Code
    const qrCode = generateQRBase64({
      sellerName: invoice.seller.nameAr,
      vatNumber: invoice.seller.vatNumber,
      timestamp: `${invoice.invoiceDate}T${invoice.invoiceTime}Z`,
      totalWithVat: invoice.grandTotal,
      vatAmount: invoice.totalTax,
      invoiceHash,
      ecicsSignature: '',
    });

    // تحضير البيانات للإرسال
    const payload = {
      invoice: Buffer.from(xml).toString('base64'),
      invoiceHash,
      uuid: invoice.uuid,
    };

    // إرسال إلى ZATCA
    const response = await sendToZATCA(
      config.environment === 'production' 
        ? ZATCA_ENDPOINTS.production.reporting 
        : ZATCA_ENDPOINTS.sandbox.reporting,
      payload,
      config
    );

    // حفظ النتيجة في قاعدة البيانات
    await saveSubmissionResult(
      companyId,
      invoice,
      invoiceHash,
      qrCode,
      response
    );

    return {
      success: response.success,
      submissionStatus: response.success ? 'reported' : 'rejected',
      invoiceHash,
      qrCode,
      rejectionReason: response.error?.message,
    };
  } catch (error) {
    logger.error('خطأ في إرسال الفاتورة للتقرير', error as Error, {
      invoiceNumber: invoice.invoiceNumber,
    });

    return {
      success: false,
      submissionStatus: 'error',
      rejectionReason: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}

/**
 * إرسال فاتورة للموافقة (Clearance)
 * تستخدم للفواتير الضريبية B2B
 */
export async function clearInvoice(
  invoice: ZATCAInvoice,
  companyId: string
): Promise<ZATCASubmissionResult> {
  const config = getZATCAConfig();
  
  logger.info('إرسال فاتورة للموافقة', { 
    invoiceNumber: invoice.invoiceNumber,
    companyId 
  });

  try {
    // توليد XML
    const xml = generateInvoiceXml(invoice);
    const invoiceHash = calculateInvoiceHash(xml);

    // تحضير البيانات للإرسال
    const payload = {
      invoice: Buffer.from(xml).toString('base64'),
      invoiceHash,
      uuid: invoice.uuid,
    };

    // إرسال إلى ZATCA
    const response = await sendToZATCA(
      config.environment === 'production' 
        ? ZATCA_ENDPOINTS.production.clearance 
        : ZATCA_ENDPOINTS.sandbox.clearance,
      payload,
      config
    );

    // استخراج QR Code من الاستجابة
    const qrCode = response.qrCode || '';
    const clearedInvoice = response.clearedInvoice || '';

    // حفظ النتيجة في قاعدة البيانات
    await saveSubmissionResult(
      companyId,
      invoice,
      invoiceHash,
      qrCode,
      response,
      clearedInvoice
    );

    return {
      success: response.success,
      submissionStatus: response.success ? 'cleared' : 'rejected',
      invoiceHash,
      qrCode,
      clearedInvoice,
      rejectionReason: response.error?.message,
    };
  } catch (error) {
    logger.error('خطأ في إرسال الفاتورة للموافقة', error as Error, {
      invoiceNumber: invoice.invoiceNumber,
    });

    return {
      success: false,
      submissionStatus: 'error',
      rejectionReason: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}

// ============================================
// التواصل مع ZATCA
// ============================================

/**
 * إرسال طلب إلى ZATCA
 */
async function sendToZATCA(
  endpoint: string,
  payload: any,
  config: ZATCAConfig
): Promise<ZATCAResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'ar',
        'Authorization': `Basic ${Buffer.from(`${config.csid}:${config.secret}`).toString('base64')}`,
        'X-ZATCA-Client-Id': config.csid,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.warn('فشل في إرسال الطلب إلى ZATCA', {
        status: response.status,
        data,
      });

      return {
        success: false,
        error: {
          code: data.code || 'UNKNOWN',
          message: data.message || 'خطأ في الاتصال بـ ZATCA',
          details: data.details,
        },
      };
    }

    logger.info('نجح إرسال الطلب إلى ZATCA', {
      status: response.status,
    });

    return {
      success: true,
      submissionUUID: data.submissionUUID,
      invoiceHash: data.invoiceHash,
      qrCode: data.qrCode,
      clearedInvoice: data.clearedInvoice,
      reportingStatus: data.reportingStatus,
      clearanceStatus: data.clearanceStatus,
    };
  } catch (error) {
    logger.error('خطأ في الاتصال بـ ZATCA', error as Error);

    return {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'خطأ في الاتصال',
      },
    };
  }
}

/**
 * التحقق من حالة الفاتورة
 */
export async function checkInvoiceStatus(
  uuid: string,
  companyId: string
): Promise<ZATCASubmissionStatus | null> {
  try {
    const document = await prisma.zATCADocument.findUnique({
      where: { uuid },
    });

    if (!document) {
      return null;
    }

    return document.submissionStatus as ZATCASubmissionStatus;
  } catch (error) {
    logger.error('خطأ في التحقق من حالة الفاتورة', error as Error, { uuid });
    return null;
  }
}

// ============================================
// حفظ النتائج
// ============================================

/**
 * حفظ نتيجة الإرسال في قاعدة البيانات
 */
async function saveSubmissionResult(
  companyId: string,
  invoice: ZATCAInvoice,
  invoiceHash: string,
  qrCode: string,
  response: ZATCAResponse,
  clearedInvoice?: string
): Promise<void> {
  try {
    // تحديد نوع المصدر
    let sourceType: 'sales_invoice' | 'sales_return' | 'purchase_invoice' = 'sales_invoice';
    
    // إنشاء أو تحديث مستند ZATCA
    const document = await prisma.zATCADocument.upsert({
      where: { uuid: invoice.uuid },
      create: {
        companyId,
        branchId: '', // يجب تمريره من الفاتورة
        sourceType,
        sourceId: invoice.invoiceNumber,
        uuid: invoice.uuid,
        invoiceHash,
        qrCodeText: qrCode,
        submissionStatus: response.success ? 'submitted' : 'rejected',
        rejectionReason: response.error?.message,
        reportedAt: response.success && !clearedInvoice ? new Date() : null,
        clearedAt: response.success && clearedInvoice ? new Date() : null,
      },
      update: {
        invoiceHash,
        qrCodeText: qrCode,
        submissionStatus: response.success ? 'submitted' : 'rejected',
        rejectionReason: response.error?.message,
        reportedAt: response.success && !clearedInvoice ? new Date() : null,
        clearedAt: response.success && clearedInvoice ? new Date() : null,
      },
    });

    // تسجيل اللوق
    await prisma.zATCALog.create({
      data: {
        zatcaDocumentId: document.id,
        actionType: clearedInvoice ? 'clear' : 'report',
        requestPayload: JSON.stringify(invoice),
        responsePayload: JSON.stringify(response),
        statusCode: response.success ? '200' : '400',
      },
    });

    logger.info('تم حفظ نتيجة الإرسال', { uuid: invoice.uuid });
  } catch (error) {
    logger.error('خطأ في حفظ نتيجة الإرسال', error as Error, {
      uuid: invoice.uuid,
    });
  }
}

// ============================================
// وظائف مساعدة
// ============================================

/**
 * التحقق من صحة إعدادات ZATCA
 */
export function validateZATCAConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getZATCAConfig();

  if (!config.csid && config.environment === 'production') {
    errors.push('CSID غير محدد للإنتاج');
  }
  if (!config.secret && config.environment === 'production') {
    errors.push('Secret غير محدد للإنتاج');
  }
  if (!config.vatNumber) {
    errors.push('الرقم الضريبي غير محدد');
  }
  if (config.vatNumber && !config.vatNumber.startsWith('3')) {
    errors.push('الرقم الضريبي يجب أن يبدأ بـ 3');
  }
  if (config.vatNumber && config.vatNumber.length !== 15) {
    errors.push('الرقم الضريبي يجب أن يتكون من 15 رقم');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * اختبار الاتصال بـ ZATCA
 */
export async function testZATCAConnection(): Promise<{ success: boolean; message: string }> {
  const config = getZATCAConfig();
  const validation = validateZATCAConfig();

  if (!validation.valid) {
    return {
      success: false,
      message: `إعدادات غير صحيحة: ${validation.errors.join(', ')}`,
    };
  }

  try {
    // إرسال طلب اختبار
    const response = await fetch(
      config.environment === 'production' 
        ? ZATCA_ENDPOINTS.production.compliance 
        : ZATCA_ENDPOINTS.sandbox.compliance,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.csid}:${config.secret}`).toString('base64')}`,
        },
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: 'الاتصال بـ ZATCA ناجح',
      };
    } else {
      return {
        success: false,
        message: `فشل الاتصال: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    };
  }
}

/**
 * إعادة إرسال فاتورة مرفوضة
 */
export async function resubmitInvoice(
  uuid: string,
  companyId: string
): Promise<ZATCASubmissionResult> {
  try {
    const document = await prisma.zATCADocument.findUnique({
      where: { uuid },
    });

    if (!document) {
      return {
        success: false,
        submissionStatus: 'error',
        rejectionReason: 'المستند غير موجود',
      };
    }

    // جلب الفاتورة الأصلية وإعادة إرسالها
    // هذا يحتاج إلى تطوير أكثر لجلب بيانات الفاتورة

    return {
      success: false,
      submissionStatus: 'error',
      rejectionReason: 'إعادة الإرسال غير مدعومة حالياً',
    };
  } catch (error) {
    logger.error('خطأ في إعادة إرسال الفاتورة', error as Error, { uuid });
    return {
      success: false,
      submissionStatus: 'error',
      rejectionReason: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}

// تصدير افتراضي
export default {
  reportInvoice,
  clearInvoice,
  checkInvoiceStatus,
  validateZATCAConfig,
  testZATCAConnection,
  resubmitInvoice,
};
