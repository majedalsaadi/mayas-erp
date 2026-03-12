/**
 * Mayas ERP - ZATCA Documents API
 * API مستندات هيئة الزكاة والضريبة والجمارك
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { zatcaSubmissionSchema } from '@/types/tax';
import { createLogger } from '@/lib/logger';
import { reportInvoice, clearInvoice, checkInvoiceStatus, validateZATCAConfig, testZATCAConnection } from '@/lib/zatca/submitter';
import { generateInvoiceXml, calculateInvoiceHash } from '@/lib/zatca/xml-generator';
import { generateQRCode } from '@/lib/zatca/qr-generator';
import { calculateTaxForLines } from '@/lib/tax/calculator';

const logger = createLogger('ZATCADocumentsAPI');

// ============================================
// GET - جلب مستندات ZATCA
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sourceType = searchParams.get('sourceType') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * pageSize;

    const where = {
      ...(status && { submissionStatus: status }),
      ...(sourceType && { sourceType }),
      ...(search && {
        OR: [
          { uuid: { contains: search, mode: 'insensitive' } },
          { sourceId: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    };

    const [documents, total] = await Promise.all([
      prisma.zATCADocument.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          logs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.zATCADocument.count({ where }),
    ]);

    return paginatedResponse(documents, total, page, pageSize);
  } catch (error) {
    logger.error('خطأ في جلب مستندات ZATCA', error as Error);
    return errorResponse('خطأ في جلب مستندات ZATCA');
  }
}

// ============================================
// POST - إرسال فاتورة لـ ZATCA
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = zatcaSubmissionSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const { sourceType, sourceId, submitToZatca } = validation.data;
    const companyId = '00000000-0000-0000-0000-000000000001';

    // جلب بيانات الفاتورة
    const invoiceData = await getInvoiceData(sourceType, sourceId);
    
    if (!invoiceData) {
      return errorResponse('الفاتورة غير موجودة', 404);
    }

    // التحقق من عدم إرسال الفاتورة مسبقاً
    const existingDoc = await prisma.zATCADocument.findFirst({
      where: {
        sourceType,
        sourceId,
        submissionStatus: { in: ['reported', 'cleared'] },
      },
    });

    if (existingDoc) {
      return errorResponse('الفاتورة تم إرسالها مسبقاً', 409);
    }

    if (!submitToZatca) {
      // فقط إنشاء XML و QR بدون إرسال
      const xml = generateInvoiceXml(invoiceData.zatcaInvoice);
      const invoiceHash = calculateInvoiceHash(xml);
      const qrCode = generateQRCode({
        sellerName: invoiceData.zatcaInvoice.seller.nameAr,
        vatNumber: invoiceData.zatcaInvoice.seller.vatNumber,
        timestamp: `${invoiceData.zatcaInvoice.invoiceDate}T${invoiceData.zatcaInvoice.invoiceTime}Z`,
        totalWithVat: invoiceData.zatcaInvoice.grandTotal,
        vatAmount: invoiceData.zatcaInvoice.totalTax,
        invoiceHash,
        ecicsSignature: '',
      });

      return successResponse({
        xml,
        invoiceHash,
        qrCode: qrCode.qrText,
        invoice: invoiceData.zatcaInvoice,
      }, 'تم إنشاء مستند ZATCA بنجاح');
    }

    // تحديد نوع الإرسال بناءً على نوع العميل
    const isB2B = invoiceData.customerVatNumber && invoiceData.customerVatNumber.length > 0;

    let result;
    if (isB2B) {
      // إرسال للموافقة (Clearance) للفواتير B2B
      result = await clearInvoice(invoiceData.zatcaInvoice, companyId);
    } else {
      // إرسال للتقرير (Reporting) للفواتير B2C
      result = await reportInvoice(invoiceData.zatcaInvoice, companyId);
    }

    if (result.success) {
      logger.info('تم إرسال الفاتورة لـ ZATCA بنجاح', {
        sourceType,
        sourceId,
        status: result.submissionStatus,
      });

      return successResponse({
        submissionStatus: result.submissionStatus,
        invoiceHash: result.invoiceHash,
        qrCode: result.qrCode,
        clearedInvoice: result.clearedInvoice,
      }, 'تم إرسال الفاتورة لـ ZATCA بنجاح');
    } else {
      logger.warn('فشل إرسال الفاتورة لـ ZATCA', {
        sourceType,
        sourceId,
        reason: result.rejectionReason,
      });

      return errorResponse(result.rejectionReason || 'فشل إرسال الفاتورة', 400);
    }
  } catch (error) {
    logger.error('خطأ في إرسال الفاتورة لـ ZATCA', error as Error);
    return errorResponse('خطأ في إرسال الفاتورة لـ ZATCA');
  }
}

// ============================================
// PATCH - إجراءات متعددة
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, uuid, id } = body;

    switch (action) {
      case 'check-status':
        // التحقق من حالة مستند
        if (!uuid && !id) {
          return errorResponse('معرف المستند مطلوب', 400);
        }
        
        const documentId = id || uuid;
        const status = await checkInvoiceStatus(documentId, '00000000-0000-0000-0000-000000000001');
        
        if (!status) {
          return errorResponse('المستند غير موجود', 404);
        }
        
        return successResponse({ status }, 'تم جلب حالة المستند');

      case 'validate-config':
        // التحقق من إعدادات ZATCA
        const configValidation = validateZATCAConfig();
        return successResponse(configValidation, 'تم التحقق من الإعدادات');

      case 'test-connection':
        // اختبار الاتصال بـ ZATCA
        const connectionTest = await testZATCAConnection();
        return successResponse(connectionTest, 'تم اختبار الاتصال');

      case 'regenerate-xml':
        // إعادة توليد XML
        if (!id) {
          return errorResponse('معرف المستند مطلوب', 400);
        }

        const doc = await prisma.zATCADocument.findUnique({
          where: { id },
        });

        if (!doc) {
          return errorResponse('المستند غير موجود', 404);
        }

        // جلب بيانات الفاتورة وإعادة توليد XML
        const invoiceDataForXml = await getInvoiceData(doc.sourceType as any, doc.sourceId);
        
        if (!invoiceDataForXml) {
          return errorResponse('الفاتورة غير موجودة', 404);
        }

        const newXml = generateInvoiceXml(invoiceDataForXml.zatcaInvoice);
        const newHash = calculateInvoiceHash(newXml);

        // تحديث المستند
        await prisma.zATCADocument.update({
          where: { id },
          data: {
            invoiceHash: newHash,
          },
        });

        return successResponse({
          xml: newXml,
          invoiceHash: newHash,
        }, 'تم إعادة توليد XML بنجاح');

      default:
        return errorResponse('إجراء غير معروف', 400);
    }
  } catch (error) {
    logger.error('خطأ في معالجة طلب ZATCA', error as Error);
    return errorResponse('خطأ في معالجة الطلب');
  }
}

// ============================================
// وظائف مساعدة
// ============================================

/**
 * جلب بيانات الفاتورة من قاعدة البيانات
 */
async function getInvoiceData(sourceType: string, sourceId: string) {
  try {
    if (sourceType === 'sales_invoice') {
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: sourceId },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
          customer: true,
        },
      });

      if (!invoice) return null;

      // جلب معلومات الشركة والفرع
      const company = await prisma.company.findFirst();
      const branch = await prisma.branch.findUnique({
        where: { id: invoice.branchId },
      });

      if (!company || !branch) return null;

      // تحويل البيانات إلى صيغة ZATCA
      const zatcaInvoice = await convertToZATCAInvoice(invoice, company, branch);

      return {
        zatcaInvoice,
        customerVatNumber: invoice.customer.taxNumber,
      };
    }

    // يمكن إضافة أنواع أخرى هنا (sales_return, purchase_invoice)
    return null;
  } catch (error) {
    logger.error('خطأ في جلب بيانات الفاتورة', error as Error, {
      sourceType,
      sourceId,
    });
    return null;
  }
}

/**
 * تحويل فاتورة المبيعات إلى صيغة ZATCA
 */
async function convertToZATCAInvoice(
  invoice: any,
  company: any,
  branch: any
): Promise<any> {
  const { v4: uuidv4 } = require('crypto');
  const invoiceUuid = uuidv4();

  // تحويل البنود
  const lines = await Promise.all(invoice.lines.map(async (line: any, index: number) => {
    const taxCode = line.taxCodeId 
      ? await prisma.taxCode.findUnique({ where: { id: line.taxCodeId } })
      : null;

    return {
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item?.code || '',
      itemNameAr: line.item?.nameAr || line.description || '',
      itemNameEn: line.item?.nameEn || '',
      quantity: Number(line.qty),
      unitCode: 'PCE', // يجب جلبه من وحدة الصنف
      unitPrice: Number(line.unitPrice),
      discountAmount: Number(line.discountAmount),
      taxableAmount: Number(line.lineTotal) - Number(line.taxAmount),
      taxCodeId: line.taxCodeId || '',
      taxRate: taxCode ? Number(taxCode.rate) : 15,
      taxAmount: Number(line.taxAmount),
      lineTotal: Number(line.lineTotal),
      zatcaCategory: (taxCode?.zatcaCategory || 'STANDARD') as any,
    };
  }));

  return {
    uuid: invoiceUuid,
    invoiceNumber: invoice.invoiceNo,
    invoiceType: 'invoice' as const,
    invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
    invoiceTime: invoice.invoiceDate.toISOString().split('T')[1]?.substring(0, 8) || '00:00:00',
    seller: {
      vatNumber: company.taxNumber || '',
      nameAr: company.nameAr,
      nameEn: company.nameEn,
      streetName: company.addressLine1,
      buildingNumber: '',
      city: company.city,
      postalZone: company.postalCode,
      countryCode: company.countryCode || 'SA',
    },
    buyer: {
      vatNumber: invoice.customer?.taxNumber,
      nameAr: invoice.customer?.nameAr || 'عميل نقدي',
      nameEn: invoice.customer?.nameEn || '',
      streetName: invoice.customer?.address,
      city: invoice.customer?.city,
      postalZone: '',
      countryCode: 'SA',
    },
    lines,
    subtotal: Number(invoice.subtotal),
    totalDiscount: Number(invoice.discountAmount),
    totalTax: Number(invoice.taxAmount),
    grandTotal: Number(invoice.totalAmount),
    currencyCode: invoice.currencyCode || 'SAR',
    paymentMethod: invoice.paymentMethod,
  };
}

// تصدير معلومات التشخيص
export async function OPTIONS() {
  return successResponse({
    endpoints: {
      'GET /api/zatca/documents': 'جلب قائمة المستندات',
      'POST /api/zatca/documents': 'إرسال فاتورة جديدة',
      'PATCH /api/zatca/documents': 'إجراءات متعددة (check-status, validate-config, test-connection)',
    },
    supportedSourceTypes: ['sales_invoice', 'sales_return'],
    supportedStatuses: ['pending', 'submitted', 'reported', 'cleared', 'rejected', 'error'],
  });
}
