/**
 * Mayas ERP - ZATCA XML Generator
 * مولد XML للفواتير الإلكترونية لهيئة الزكاة والضريبة والجمارك
 * 
 * يتوافق مع مواصفات ZATCA UBL 2.1
 */

import { createLogger } from '@/lib/logger';
import type {
  ZATCAInvoice,
  ZATCAInvoiceLine,
  ZATCAInvoiceType,
  ZATCACategory,
  ZATCA_UNIT_CODES,
  ZATCA_INVOICE_TYPE_CODES,
  ZATCA_TAX_CATEGORY_CODES,
} from '@/types/tax';

const logger = createLogger('ZATCAXmlGenerator');

// ============================================
// الثوابت
// ============================================

const UBL_VERSION = '2.1';
const CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017';
const ZATCA_CUSTOMIZATION = 'urn:cen.eu:en16931:2017#compliant#urn:zatca.gov.sa:en16931:2017';

// ============================================
// وظائف مساعدة
// ============================================

/**
 * تنسيق التاريخ بصيغة ISO
 */
function formatDate(isoDate: string): string {
  return isoDate.split('T')[0] || isoDate.substring(0, 10);
}

/**
 * تنسيق الوقت بصيغة ISO
 */
function formatTime(isoTime: string): string {
  return isoTime.includes('T') ? isoTime.split('T')[1] || '00:00:00' : isoTime;
}

/**
 * تنسيق المبلغ
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * escape XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * الحصول على كود نوع الفاتورة
 */
function getInvoiceTypeCode(type: ZATCAInvoiceType): string {
  const codes: Record<ZATCAInvoiceType, string> = {
    invoice: '388',
    debit_note: '384',
    credit_note: '381',
    prepayment: '386',
  };
  return codes[type] || '388';
}

/**
 * الحصول على كود فئة الضريبة
 */
function getTaxCategoryCode(category: ZATCACategory): string {
  const codes: Record<ZATCACategory, string> = {
    STANDARD: 'S',
    ZERO_RATE: 'Z',
    EXEMPT: 'E',
    OUT_OF_SCOPE: 'O',
    REVERSE_CHARGE: 'AE',
  };
  return codes[category] || 'S';
}

/**
 * الحصول على رمز سبب الإعفاء
 */
function getExemptionReasonCode(category: ZATCACategory): string | null {
  switch (category) {
    case 'EXEMPT':
      return 'VATEX-EU-O';
    case 'OUT_OF_SCOPE':
      return 'VATEX-EU-IC';
    default:
      return null;
  }
}

// ============================================
// توليد XML
// ============================================

/**
 * توليد رأس الفاتورة
 */
function generateInvoiceHeader(invoice: ZATCAInvoice): string {
  return `
    <cbc:ProfileID>${ZATCA_CUSTOMIZATION}</cbc:ProfileID>
    <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
    <cbc:UUID>${invoice.uuid}</cbc:UUID>
    <cbc:IssueDate>${formatDate(invoice.invoiceDate)}</cbc:IssueDate>
    <cbc:IssueTime>${formatTime(invoice.invoiceTime)}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoice.invoiceType}">${getInvoiceTypeCode(invoice.invoiceType)}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${invoice.currencyCode}</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>`;
}

/**
 * توليد معلومات المورد (البائع)
 */
function generateSupplierParty(seller: ZATCAInvoice['seller']): string {
  return `
    <cac:AccountingSupplierParty>
      <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="CRN">${escapeXml(seller.vatNumber)}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PartyName>
          <cbc:Name>${escapeXml(seller.nameAr)}</cbc:Name>
        </cac:PartyName>
        <cac:PostalAddress>
          <cbc:StreetName>${escapeXml(seller.streetName || 'الرياض')}</cbc:StreetName>
          <cbc:BuildingNumber>${escapeXml(seller.buildingNumber || '0000')}</cbc:BuildingNumber>
          ${seller.plotIdentification ? `<cbc:PlotIdentification>${escapeXml(seller.plotIdentification)}</cbc:PlotIdentification>` : ''}
          ${seller.citySubdivision ? `<cbc:CitySubdivisionName>${escapeXml(seller.citySubdivision)}</cbc:CitySubdivisionName>` : ''}
          <cbc:CityName>${escapeXml(seller.city || 'الرياض')}</cbc:CityName>
          <cbc:PostalZone>${escapeXml(seller.postalZone || '00000')}</cbc:PostalZone>
          <cbc:CountrySubentity>المنطقة</cbc:CountrySubentity>
          <cac:Country>
            <cbc:IdentificationCode>${seller.countryCode}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        <cac:PartyTaxScheme>
          <cbc:CompanyID>${escapeXml(seller.vatNumber)}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(seller.nameAr)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:Party>
    </cac:AccountingSupplierParty>`;
}

/**
 * توليد معلومات العميل (المشتري)
 */
function generateCustomerParty(buyer: ZATCAInvoice['buyer']): string {
  const hasVat = buyer.vatNumber && buyer.vatNumber.length > 0;
  
  return `
    <cac:AccountingCustomerParty>
      <cac:Party>
        ${hasVat ? `
        <cac:PartyIdentification>
          <cbc:ID schemeID="CRN">${escapeXml(buyer.vatNumber!)}</cbc:ID>
        </cac:PartyIdentification>` : ''}
        <cac:PartyName>
          <cbc:Name>${escapeXml(buyer.nameAr)}</cbc:Name>
        </cac:PartyName>
        <cac:PostalAddress>
          <cbc:StreetName>${escapeXml(buyer.streetName || 'غير محدد')}</cbc:StreetName>
          ${buyer.buildingNumber ? `<cbc:BuildingNumber>${escapeXml(buyer.buildingNumber)}</cbc:BuildingNumber>` : ''}
          ${buyer.citySubdivision ? `<cbc:CitySubdivisionName>${escapeXml(buyer.citySubdivision)}</cbc:CitySubdivisionName>` : ''}
          <cbc:CityName>${escapeXml(buyer.city || 'غير محدد')}</cbc:CityName>
          ${buyer.postalZone ? `<cbc:PostalZone>${escapeXml(buyer.postalZone)}</cbc:PostalZone>` : ''}
          <cac:Country>
            <cbc:IdentificationCode>${buyer.countryCode}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        ${hasVat ? `
        <cac:PartyTaxScheme>
          <cbc:CompanyID>${escapeXml(buyer.vatNumber!)}</cbc:CompanyID>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:PartyTaxScheme>` : ''}
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${escapeXml(buyer.nameAr)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:Party>
    </cac:AccountingCustomerParty>`;
}

/**
 * توليد بند الفاتورة
 */
function generateInvoiceLine(line: ZATCAInvoiceLine, index: number): string {
  const taxCategoryCode = getTaxCategoryCode(line.zatcaCategory);
  const exemptionReason = getExemptionReasonCode(line.zatcaCategory);
  
  let taxTotalXml = `
          <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${formatAmount(line.taxAmount)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
              <cbc:TaxableAmount currencyID="SAR">${formatAmount(line.taxableAmount)}</cbc:TaxableAmount>
              <cbc:TaxAmount currencyID="SAR">${formatAmount(line.taxAmount)}</cbc:TaxAmount>
              <cac:TaxCategory>
                <cbc:ID>${taxCategoryCode}</cbc:ID>
                <cbc:Percent>${line.taxRate}</cbc:Percent>
                <cac:TaxScheme>
                  <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
              </cac:TaxCategory>
            </cac:TaxSubtotal>
          </cac:TaxTotal>`;

  // إضافة سبب الإعفاء للفئات المعفاة
  if (exemptionReason) {
    taxTotalXml = `
          <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${formatAmount(line.taxAmount)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
              <cbc:TaxableAmount currencyID="SAR">${formatAmount(line.taxableAmount)}</cbc:TaxableAmount>
              <cbc:TaxAmount currencyID="SAR">${formatAmount(line.taxAmount)}</cbc:TaxAmount>
              <cac:TaxCategory>
                <cbc:ID>${taxCategoryCode}</cbc:ID>
                <cbc:Percent>${line.taxRate}</cbc:Percent>
                <cbc:TaxExemptionReasonCode>${exemptionReason}</cbc:TaxExemptionReasonCode>
                <cac:TaxScheme>
                  <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
              </cac:TaxCategory>
            </cac:TaxSubtotal>
          </cac:TaxTotal>`;
  }

  return `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:Note>${escapeXml(line.itemNameAr)}</cbc:Note>
      <cbc:InvoicedQuantity unitCode="${line.unitCode}">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${formatAmount(line.taxableAmount)}</cbc:LineExtensionAmount>
      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:AllowanceChargeReason>خصم</cbc:AllowanceChargeReason>
        <cbc:Amount currencyID="SAR">${formatAmount(line.discountAmount)}</cbc:Amount>
      </cac:AllowanceCharge>
      <cac:Item>
        <cbc:Description>${escapeXml(line.itemNameAr)}</cbc:Description>
        <cbc:Name>${escapeXml(line.itemNameAr)}</cbc:Name>
        <cac:BuyersItemIdentification>
          <cbc:ID>${escapeXml(line.itemCode)}</cbc:ID>
        </cac:BuyersItemIdentification>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(line.itemCode)}</cbc:ID>
        </cac:SellersItemIdentification>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${taxCategoryCode}</cbc:ID>
          <cbc:Percent>${line.taxRate}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${formatAmount(line.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
}

/**
 * توليد ملخص ضرائب الفاتورة
 */
function generateTaxTotal(
  lines: ZATCAInvoiceLine[],
  totalTax: number
): string {
  // تجميع الضرائب حسب الفئة
  const taxGroups = new Map<string, { taxableAmount: number; taxAmount: number; rate: number; category: ZATCACategory }>();
  
  for (const line of lines) {
    const key = `${line.zatcaCategory}-${line.taxRate}`;
    const existing = taxGroups.get(key);
    
    if (existing) {
      existing.taxableAmount += line.taxableAmount;
      existing.taxAmount += line.taxAmount;
    } else {
      taxGroups.set(key, {
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
        rate: line.taxRate,
        category: line.zatcaCategory,
      });
    }
  }

  // توليد XML للمجموعات
  let subtotalsXml = '';
  for (const group of taxGroups.values()) {
    const categoryCode = getTaxCategoryCode(group.category);
    const exemptionReason = getExemptionReasonCode(group.category);
    
    subtotalsXml += `
            <cac:TaxSubtotal>
              <cbc:TaxableAmount currencyID="SAR">${formatAmount(group.taxableAmount)}</cbc:TaxableAmount>
              <cbc:TaxAmount currencyID="SAR">${formatAmount(group.taxAmount)}</cbc:TaxAmount>
              <cac:TaxCategory>
                <cbc:ID>${categoryCode}</cbc:ID>
                <cbc:Percent>${group.rate}</cbc:Percent>
                ${exemptionReason ? `<cbc:TaxExemptionReasonCode>${exemptionReason}</cbc:TaxExemptionReasonCode>` : ''}
                <cac:TaxScheme>
                  <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
              </cac:TaxCategory>
            </cac:TaxSubtotal>`;
  }

  return `
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${formatAmount(totalTax)}</cbc:TaxAmount>${subtotalsXml}
    </cac:TaxTotal>`;
}

/**
 * توليد المجاميع النهائية
 */
function generateMonetaryTotals(
  subtotal: number,
  totalDiscount: number,
  grandTotal: number
): string {
  return `
    <cac:LegalMonetaryTotal>
      <cbc:LineExtensionAmount currencyID="SAR">${formatAmount(subtotal)}</cbc:LineExtensionAmount>
      <cbc:TaxExclusiveAmount currencyID="SAR">${formatAmount(subtotal)}</cbc:TaxExclusiveAmount>
      <cbc:TaxInclusiveAmount currencyID="SAR">${formatAmount(grandTotal)}</cbc:TaxInclusiveAmount>
      <cbc:AllowanceTotalAmount currencyID="SAR">${formatAmount(totalDiscount)}</cbc:AllowanceTotalAmount>
      <cbc:PayableAmount currencyID="SAR">${formatAmount(grandTotal)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>`;
}

/**
 * توليد التوقيع الرقمي (placeholder)
 */
function generateSignature(invoiceHash?: string): string {
  return `
    <cac:Signature>
      <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
      <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
      <cac:SignatoryParty>
        <cac:PartyIdentification>
          <cbc:ID>ZATCA</cbc:ID>
        </cac:PartyIdentification>
      </cac:SignatoryParty>
      <cac:DigitalSignatureAttachment>
        <cac:ExternalReference>
          <cbc:URI>${invoiceHash || '#signature'}</cbc:URI>
        </cac:ExternalReference>
      </cac:DigitalSignatureAttachment>
    </cac:Signature>`;
}

/**
 * توليد XML كامل للفاتورة
 */
export function generateInvoiceXml(invoice: ZATCAInvoice): string {
  logger.info('توليد XML للفاتورة', { invoiceNumber: invoice.invoiceNumber, uuid: invoice.uuid });

  // توليد البنود
  const linesXml = invoice.lines
    .map((line, index) => generateInvoiceLine(line, index))
    .join('\n');

  // توليد XML الكامل
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  ${generateInvoiceHeader(invoice)}
  ${generateSignature(invoice.previousInvoiceHash)}
  ${generateSupplierParty(invoice.seller)}
  ${invoice.buyer ? generateCustomerParty(invoice.buyer) : ''}
  ${invoice.paymentMethod ? `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:InstructionNote>${escapeXml(invoice.paymentMethod)}</cbc:InstructionNote>
  </cac:PaymentMeans>` : ''}
  ${generateTaxTotal(invoice.lines, invoice.totalTax)}
  ${generateMonetaryTotals(invoice.subtotal, invoice.totalDiscount, invoice.grandTotal)}
  ${linesXml}
</Invoice>`;

  logger.debug('تم توليد XML للفاتورة بنجاح', { 
    invoiceNumber: invoice.invoiceNumber,
    linesCount: invoice.lines.length 
  });

  return xml;
}

/**
 * توليد XML مضغوط (Base64)
 */
export function generateInvoiceXmlBase64(invoice: ZATCAInvoice): string {
  const xml = generateInvoiceXml(invoice);
  const base64 = Buffer.from(xml, 'utf-8').toString('base64');
  return base64;
}

/**
 * حساب hash للفاتورة
 */
export function calculateInvoiceHash(xml: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(xml, 'utf-8').digest('hex');
}

/**
 * التحقق من صحة XML
 */
export function validateInvoiceXml(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // التحقق من العناصر الأساسية
  if (!xml.includes('<Invoice')) {
    errors.push('عنصر Invoice غير موجود');
  }
  if (!xml.includes('<cbc:ID>')) {
    errors.push('معرف الفاتورة غير موجود');
  }
  if (!xml.includes('<cbc:UUID>')) {
    errors.push('UUID غير موجود');
  }
  if (!xml.includes('<cbc:IssueDate>')) {
    errors.push('تاريخ الإصدار غير موجود');
  }
  if (!xml.includes('<cac:AccountingSupplierParty>')) {
    errors.push('معلومات المورد غير موجودة');
  }
  if (!xml.includes('<cac:InvoiceLine>')) {
    errors.push('لا توجد بنود في الفاتورة');
  }
  if (!xml.includes('<cac:TaxTotal>')) {
    errors.push('ملخص الضريبة غير موجود');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// تصدير افتراضي
export default {
  generateInvoiceXml,
  generateInvoiceXmlBase64,
  calculateInvoiceHash,
  validateInvoiceXml,
};
