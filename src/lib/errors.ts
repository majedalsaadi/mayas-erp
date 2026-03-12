/**
 * Mayas ERP - Error Handling
 * معالجة الأخطاء
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * أنواع الأخطاء
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * خطأ مخصص
 */
export class AppError extends Error {
  type: ErrorType;
  statusCode: number;
  details?: any;

  constructor(message: string, type: ErrorType = ErrorType.INTERNAL, statusCode: number = 500, details?: any) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * أخطاء مخصصة شائعة
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'البيانات غير موجودة') {
    super(message, ErrorType.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'غير مصرح بالوصول') {
    super(message, ErrorType.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'الوصول ممنوع') {
    super(message, ErrorType.FORBIDDEN, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, 409, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'خطأ في قاعدة البيانات', details?: any) {
    super(message, ErrorType.DATABASE, 500, details);
  }
}

/**
 * معالجة أخطاء Prisma
 */
export function handlePrismaError(error: any): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // انتهاك القيد الفريد
        const target = (error.meta?.target as string[]) || [];
        return new ConflictError(
          `القيمة موجودة مسبقاً في حقل: ${target.join(', ')}`,
          { field: target }
        );

      case 'P2025':
        // السجل غير موجود
        return new NotFoundError('البيانات غير موجودة');

      case 'P2003':
        // انتهاك المفتاح الأجنبي
        return new ValidationError('لا يمكن تنفيذ العملية - البيانات مرتبطة بسجلات أخرى');

      case 'P2014':
        // انتهاك العلاقة
        return new ValidationError('لا يمكن حذف البيانات - توجد بيانات مرتبطة');

      case 'P2016':
        // خطأ في الاستعلام
        return new DatabaseError('خطأ في الاستعلام', error.message);

      default:
        return new DatabaseError('خطأ في قاعدة البيانات', {
          code: error.code,
          message: error.message,
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('خطأ في التحقق من البيانات', error.message);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new DatabaseError('خطأ غير معروف في قاعدة البيانات');
  }

  return new DatabaseError('خطأ في قاعدة البيانات', error.message);
}

/**
 * معالجة أخطاء Zod
 */
export function handleZodError(error: ZodError): ValidationError {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return new ValidationError('خطأ في التحقق من البيانات', errors);
}

/**
 * معالج الأخطاء الرئيسي
 */
export function handleError(error: unknown): NextResponse {
  console.error('Error:', error);

  // خطأ Zod
  if (error instanceof ZodError) {
    const appError = handleZodError(error);
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        type: appError.type,
        details: appError.details,
      },
      { status: appError.statusCode }
    );
  }

  // خطأ Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientUnknownRequestError) {
    const appError = handlePrismaError(error);
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        type: appError.type,
        details: appError.details,
      },
      { status: appError.statusCode }
    );
  }

  // خطأ التطبيق المخصص
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // خطأ عام
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'خطأ داخلي في الخادم',
        type: ErrorType.INTERNAL,
      },
      { status: 500 }
    );
  }

  // خطأ غير معروف
  return NextResponse.json(
    {
      success: false,
      error: 'خطأ داخلي في الخادم',
      type: ErrorType.INTERNAL,
    },
    { status: 500 }
  );
}

/**
 * try-catch wrapper للأAPI routes
 */
export function withErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
