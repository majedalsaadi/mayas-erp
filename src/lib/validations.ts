/**
 * Mayas ERP - Validation Schemas
 * مخططات التحقق من البيانات
 */

import { z } from 'zod';

// ============================================
// المصادقة
// ============================================

export const loginSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

// ============================================
// الشركة والفروع
// ============================================

export const companySchema = z.object({
  code: z.string().min(2).max(20),
  nameAr: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(100),
  legalNameAr: z.string().optional(),
  legalNameEn: z.string().optional(),
  taxNumber: z.string().regex(/^3\d{14}$/, 'الرقم الضريبي غير صحيح').optional(),
  commercialRegistration: z.string().length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام').optional(),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  website: z.string().url('الموقع الإلكتروني غير صحيح').optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().optional(),
  currencyCode: z.string().default('SAR'),
  languageDefault: z.enum(['ar', 'en']).default('ar'),
  timezone: z.string().default('Asia/Riyadh'),
  fiscalYearStartMonth: z.number().min(1).max(12).default(1),
});

export const branchSchema = z.object({
  code: z.string().min(2).max(20),
  nameAr: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  isMainBranch: z.boolean().default(false),
});

// ============================================
// المستخدمون
// ============================================

export const userSchema = z.object({
  employeeCode: z.string().optional(),
  fullName: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يكون أحرف إنجليزية وأرقام فقط'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().optional(),
  language: z.enum(['ar', 'en']).default('ar'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').optional(),
  roleIds: z.array(z.string()).optional(),
  branchIds: z.array(z.string()).optional(),
  warehouseIds: z.array(z.string()).optional(),
});

// ============================================
// الأصناف
// ============================================

export const itemSchema = z.object({
  code: z.string().min(1).max(50),
  sku: z.string().optional(),
  nameAr: z.string().min(2, 'الاسم العربي مطلوب'),
  nameEn: z.string().min(2, 'الاسم الإنجليزي مطلوب'),
  shortName: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  manufacturerId: z.string().optional(),
  partNumber: z.string().optional(),
  oemNumber: z.string().optional(),
  unitId: z.string(),
  purchaseUnitId: z.string().optional(),
  salesUnitId: z.string().optional(),
  itemType: z.enum(['stock', 'service', 'bundle', 'non_stock']).default('stock'),
  trackInventory: z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
  hasExpiry: z.boolean().default(false),
  hasSerial: z.boolean().default(false),
  hasBatch: z.boolean().default(false),
  taxCodeId: z.string().optional(),
  minStockLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const itemPriceSchema = z.object({
  itemId: z.string(),
  priceTierId: z.string(),
  currencyCode: z.string().default('SAR'),
  price: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي صفر'),
  minQty: z.number().min(1).default(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

// ============================================
// العملاء
// ============================================

export const customerSchema = z.object({
  code: z.string().min(1).max(50),
  nameAr: z.string().min(2, 'الاسم العربي مطلوب'),
  nameEn: z.string().min(2, 'الاسم الإنجليزي مطلوب'),
  customerGroupId: z.string().optional(),
  customerType: z.enum(['retail', 'wholesale', 'workshop', 'distributor']).default('retail'),
  taxNumber: z.string().optional(),
  commercialRegistration: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  creditDays: z.number().min(0).default(0),
  priceTierId: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// ============================================
// المبيعات
// ============================================

export const salesInvoiceSchema = z.object({
  customerId: z.string(),
  branchId: z.string(),
  warehouseId: z.string(),
  invoiceDate: z.date(),
  invoiceType: z.enum(['cash', 'credit']).default('credit'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'cheque', 'credit']).optional(),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    qty: z.number().min(0.0001, 'الكمية يجب أن تكون أكبر من صفر'),
    unitId: z.string(),
    unitPrice: z.number().min(0),
    discountPercent: z.number().min(0).max(100).default(0),
    notes: z.string().optional(),
  })).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

// ============================================
// التقارير
// ============================================

export const reportFilterSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  branchId: z.string().optional(),
  warehouseId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  itemId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return data.dateFrom <= data.dateTo;
  }
  return true;
}, {
  message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
  path: ['dateTo'],
});

// ============================================
// Pagination
// ============================================

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

// ============================================
// Common
// ============================================

export const idSchema = z.string().uuid('المعرف غير صحيح');

export const idsSchema = z.array(z.string().uuid()).min(1);

export const statusSchema = z.enum(['draft', 'pending', 'approved', 'posted', 'cancelled', 'closed']);
