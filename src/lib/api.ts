/**
 * Mayas ERP - API Response Helper
 * مساعد استجابات API
 */

import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';

/**
 * استجابة نجاح
 */
export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

/**
 * استجابة خطأ
 */
export function errorResponse(error: string, status: number = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * استجابة ترقيم صفحات
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/**
 * استجابة غير موجود
 */
export function notFoundResponse(message: string = 'البيانات غير موجودة'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 404);
}

/**
 * استجابة غير مصرح
 */
export function unauthorizedResponse(message: string = 'غير مصرح لك بالوصول'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 401);
}

/**
 * استجابة ممنوع
 */
export function forbiddenResponse(message: string = 'الوصول ممنوع'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 403);
}

/**
 * استجابة خطأ في التحقق
 */
export function validationErrorResponse(errors: Record<string, string>): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'خطأ في التحقق من البيانات',
      errors,
    },
    { status: 422 }
  );
}

/**
 * استجابة خطأ داخلي
 */
export function internalErrorResponse(message: string = 'خطأ داخلي في الخادم'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 500);
}
