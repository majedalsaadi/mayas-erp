/**
 * Mayas ERP - Logout API
 * API تسجيل الخروج
 */

import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * تسجيل الخروج
 */
export async function POST(request: NextRequest) {
  try {
    // محاولة تسجيل الخروج من Supabase
    const result = await logout();

    // إنشاء الرد
    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });

    // حذف cookie المصادقة
    response.cookies.delete('auth-token');

    // حذف cookies أخرى مرتبطة بالمصادقة
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error) {
    console.error('خطأ في API تسجيل الخروج:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تسجيل الخروج',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/logout
 * تسجيل الخروج (للتوافق مع الروابط)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
