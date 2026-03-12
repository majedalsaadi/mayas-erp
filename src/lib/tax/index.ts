/**
 * Mayas ERP - Tax Module
 * موديول الضرائب
 */

// Tax Calculator
export {
  getTaxCodeInfo,
  getDefaultSalesTaxCode,
  calculateTaxForLine,
  calculateTaxForLineAsync,
  calculateTaxForLines,
  calculateInvoiceTaxSummary,
  extractTaxFromInclusive,
  addTaxToAmount,
  validateSaudiVATNumber,
  formatVATNumber,
  clearTaxCodeCache,
  initializeDefaultTaxCodes,
} from './calculator';

// Re-export types
export type {
  TaxCode,
  TaxCodeWithDetails,
  TaxLineCalculation,
  TaxCalculationResult,
  InvoiceTaxSummary,
  TaxType,
  ZATCACategory,
} from '@/types/tax';
