/**
 * Mayas ERP - Utilities
 * أدوات مساعدة
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// CSS Utilities
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// Number Utilities
// ============================================

/**
 * تنسيق الأرقام بالفواصل
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('ar-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * تنسيق العملة
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

// ============================================
// Date Utilities
// ============================================

/**
 * تنسيق التاريخ بالعربي
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * تنسيق التاريخ والوقت
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * تنسيق التاريخ للـ input
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// ============================================
// String Utilities
// ============================================

/**
 * إنشاء رقم عشوائي
 */
export function generateRandomNumber(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

/**
 * إنشاء UUID مختصر
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * التحقق من البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * التحقق من رقم الجوال السعودي
 */
export function isValidSaudiPhone(phone: string): boolean {
  const phoneRegex = /^(\+966|966|0)?5\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// ============================================
// Validation Utilities
// ============================================

/**
 * التحقق من الرقم
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * التحقق من النص الفارغ
 */
export function isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

// ============================================
// Array Utilities
// ============================================

/**
 * تقسيم المصفوفة إلى مجموعات
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * إزالة التكرار
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * ترتيب المصفوفة
 */
export function sortBy<T>(array: T[], key: keyof T): T[] {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  });
}

// ============================================
// Object Utilities
// ============================================

/**
 * إزالة القيم الفارغة من الكائن
 */
export function removeEmpty<T extends object>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

/**
 * نسخ عميق
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================
// Business Utilities
// ============================================

/**
 * حساب الضريبة
 */
export function calculateTax(amount: number, taxRate: number): number {
  return amount * (taxRate / 100);
}

/**
 * حساب الخصم
 */
export function calculateDiscount(amount: number, discountPercent: number): number {
  return amount * (discountPercent / 100);
}

/**
 * حساب الإجمالي مع الضريبة
 */
export function calculateTotalWithTax(amount: number, taxRate: number): number {
  return amount + calculateTax(amount, taxRate);
}

/**
 * حساب هامش الربح
 */
export function calculateProfitMargin(cost: number, price: number): number {
  if (cost === 0) return 0;
  return ((price - cost) / cost) * 100;
}

/**
 * حساب نسبة الربح من البيع
 */
export function calculateProfitPercent(cost: number, price: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

// ============================================
// Error Handling
// ============================================

/**
 * معالجة الأخطاء
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'حدث خطأ غير متوقع';
}

// ============================================
// Debounce & Throttle
// ============================================

/**
 * تأخير التنفيذ
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * تحديد معدل التنفيذ
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
