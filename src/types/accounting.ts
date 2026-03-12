/**
 * Mayas ERP - Accounting Types
 * أنواع TypeScript للمحاسبة
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// أنواع الحسابات
// ============================================

/** نوع الحساب */
export type AccountType = 
  | 'asset'      // أصول
  | 'liability'  // خصوم
  | 'equity'     // حقوق الملكية
  | 'revenue'    // إيرادات
  | 'expense';   // مصروفات

/** حالة الحساب */
export type AccountStatus = 'active' | 'inactive';

/** الحساب */
export interface AccountRecord {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  accountType: AccountType;
  levelNo: number;
  isPostable: boolean;
  currencyControl: boolean;
  branchTracking: boolean;
  costCenterTracking: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: AccountRecord;
  children?: AccountRecord[];
  balance?: number;
}

/** الحساب مع العلاقات */
export interface AccountWithRelations extends AccountRecord {
  parent?: AccountRecord | null;
  children?: AccountRecord[];
  _count?: {
    journalLines: number;
  };
}

/** طلب إنشاء حساب */
export interface CreateAccountRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  accountType: AccountType;
  isPostable?: boolean;
  currencyControl?: boolean;
  branchTracking?: boolean;
  costCenterTracking?: boolean;
  isActive?: boolean;
}

/** طلب تحديث حساب */
export interface UpdateAccountRequest {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  parentId?: string;
  accountType?: AccountType;
  isPostable?: boolean;
  currencyControl?: boolean;
  branchTracking?: boolean;
  costCenterTracking?: boolean;
  isActive?: boolean;
}

/** فلتر البحث في الحسابات */
export interface AccountSearchFilters {
  query?: string;
  accountType?: AccountType;
  parentId?: string;
  isPostable?: boolean;
  isActive?: boolean;
  levelNo?: number;
}

// ============================================
// أنواع القيود المحاسبية
// ============================================

/** مصدر القيد */
export type JournalSourceType =
  | 'manual'           // قيد يدوي
  | 'sales_invoice'    // فاتورة مبيعات
  | 'purchase_invoice' // فاتورة مشتريات
  | 'sales_return'     // مرتجع مبيعات
  | 'purchase_return'  // مرتجع مشتريات
  | 'payment'          // سداد
  | 'receipt'          // قبض
  | 'inventory_adjust' // تسوية مخزون
  | 'depreciation'     // إهلاك
  | 'period_close'     // إقفال فترة
  | 'opening_balance'; // رصيد افتتاحي

/** حالة القيد */
export type JournalEntryStatus = 'draft' | 'pending' | 'posted' | 'cancelled';

/** سطر القيد */
export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode?: string;
  accountNameAr?: string;
  accountNameEn?: string;
  description?: string;
  debit: number;
  credit: number;
  customerId?: string;
  supplierId?: string;
  branchId?: string;
  costCenterId?: string;
  referenceNo?: string;
}

/** القيد المحاسبي */
export interface JournalEntryRecord {
  id: string;
  companyId: string;
  branchId: string;
  entryNo: string;
  entryDate: Date;
  sourceType?: JournalSourceType;
  sourceId?: string;
  description?: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  createdById?: string;
  approvedById?: string;
  createdAt: Date;
  postedAt?: Date;
  lines?: JournalLine[];
}

/** القيد مع العلاقات */
export interface JournalEntryWithRelations extends JournalEntryRecord {
  lines: JournalLine[];
  branch?: {
    id: string;
    nameAr: string;
    nameEn: string;
  };
  createdBy?: {
    id: string;
    fullName: string;
  };
  approvedBy?: {
    id: string;
    fullName: string;
  };
}

/** طلب إنشاء قيد */
export interface CreateJournalEntryRequest {
  branchId: string;
  entryDate: Date;
  description?: string;
  sourceType?: JournalSourceType;
  sourceId?: string;
  lines: CreateJournalLineRequest[];
}

/** طلب إنشاء سطر قيد */
export interface CreateJournalLineRequest {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  customerId?: string;
  supplierId?: string;
  branchId?: string;
  costCenterId?: string;
  referenceNo?: string;
}

/** طلب تحديث قيد */
export interface UpdateJournalEntryRequest {
  entryDate?: Date;
  description?: string;
  lines?: CreateJournalLineRequest[];
}

/** فلتر البحث في القيود */
export interface JournalEntrySearchFilters {
  query?: string;
  entryDateFrom?: Date;
  entryDateTo?: Date;
  branchId?: string;
  sourceType?: JournalSourceType;
  status?: JournalEntryStatus;
  accountId?: string;
  customerId?: string;
  supplierId?: string;
}

// ============================================
// أنواع محرك القيود الآلية
// ============================================

/** سياق الترحيل */
export interface PostingContext {
  companyId: string;
  branchId: string;
  userId?: string;
  sourceType: JournalSourceType;
  sourceId: string;
  transactionDate: Date;
  description?: string;
}

/** نتيجة الترحيل */
export interface PostingResult {
  success: boolean;
  journalEntryId?: string;
  entryNo?: string;
  totalDebit: number;
  totalCredit: number;
  lines: PostingLineResult[];
  error?: string;
}

/** نتيجة سطر الترحيل */
export interface PostingLineResult {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  description?: string;
}

/** قاعدة الترحيل */
export interface PostingRule {
  id: string;
  nameAr: string;
  nameEn: string;
  sourceType: JournalSourceType;
  priority: number;
  isActive: boolean;
  lines: PostingRuleLine[];
}

/** سطر قاعدة الترحيل */
export interface PostingRuleLine {
  id: string;
  ruleId: string;
  accountKey: string;
  debitCredit: 'debit' | 'credit';
  amountSource: 'fixed' | 'field' | 'formula';
  fixedAmount?: number;
  fieldPath?: string;
  formula?: string;
  description?: string;
}

// ============================================
// أنواع التقارير المحاسبية
// ============================================

/** ميزان المراجعة */
export interface TrialBalanceItem {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  levelNo: number;
  parentId?: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

/** ميزان المراجعة */
export interface TrialBalance {
  items: TrialBalanceItem[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
}

/** قائمة الدخل */
export interface IncomeStatementItem {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  amount: number;
  percentage?: number;
  children?: IncomeStatementItem[];
}

/** قائمة الدخل */
export interface IncomeStatement {
  revenues: IncomeStatementItem[];
  totalRevenues: number;
  expenses: IncomeStatementItem[];
  totalExpenses: number;
  grossProfit: number;
  netIncome: number;
}

/** الميزانية العمومية */
export interface BalanceSheetItem {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  amount: number;
  percentage?: number;
  children?: BalanceSheetItem[];
}

/** الميزانية العمومية */
export interface BalanceSheet {
  assets: {
    current: BalanceSheetItem[];
    fixed: BalanceSheetItem[];
    totalCurrentAssets: number;
    totalFixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    current: BalanceSheetItem[];
    longTerm: BalanceSheetItem[];
    totalCurrentLiabilities: number;
    totalLongTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    items: BalanceSheetItem[];
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

/** تقرير حركة حساب */
export interface AccountLedgerItem {
  entryDate: Date;
  entryNo: string;
  description?: string;
  referenceNo?: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType?: JournalSourceType;
  sourceId?: string;
}

/** تقرير حركة حساب */
export interface AccountLedger {
  account: AccountRecord;
  openingBalance: number;
  openingDebit: number;
  openingCredit: number;
  items: AccountLedgerItem[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

/** معايير التقارير */
export interface ReportCriteria {
  dateFrom: Date;
  dateTo: Date;
  branchId?: string;
  costCenterId?: string;
  includeOpening?: boolean;
  accountId?: string;
  accountType?: AccountType;
  levelFrom?: number;
  levelTo?: number;
}

// ============================================
// أنواع API
// ============================================

/** استجابة API للحسابات */
export interface AccountsApiResponse {
  success: boolean;
  data?: AccountRecord | AccountRecord[] | AccountWithRelations[];
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/** استجابة API للقيود */
export interface JournalEntryApiResponse {
  success: boolean;
  data?: JournalEntryRecord | JournalEntryRecord[] | JournalEntryWithRelations[];
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/** استجابة API للتقارير */
export interface ReportsApiResponse {
  success: boolean;
  data?: TrialBalance | IncomeStatement | BalanceSheet | AccountLedger;
  error?: string;
  message?: string;
}

/** معايير التصفح */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

/** استجابة التصفح */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
