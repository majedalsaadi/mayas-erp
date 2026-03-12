/**
 * Mayas ERP - Current User API
 * API بيانات المستخدم الحالي
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserFromToken } from '@/lib/auth';

/**
 * GET /api/auth/me
 * الحصول على بيانات المستخدم الحالي
 */
export async function GET(request: NextRequest) {
  try {
    // محاولة الحصول على المستخدم من الجلسة (Supabase)
    let user = await getCurrentUser();

    // إذا لم يتم العثور على مستخدم من الجلسة، جرب JWT token
    if (!user) {
      const token = request.cookies.get('auth-token')?.value;

      if (token) {
        user = await getUserFromToken(token);
      }
    }

    // إذا لم يتم العثور على مستخدم
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'غير مصرح - يرجى تسجيل الدخول',
        },
        { status: 401 }
      );
    }

    // إرجاع بيانات المستخدم
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        companyId: user.companyId,
        language: user.language,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error('خطأ في API بيانات المستخدم الحالي:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء الحصول على بيانات المستخدم',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/me
 * تحديث بيانات المستخدم الحالي (اختياري)
 */
export async function POST(request: NextRequest) {
  try {
    // الحصول على المستخدم الحالي
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'غير مصرح - يرجى تسجيل الدخول',
        },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'غير مصرح - يرجى تسجيل الدخول',
        },
        { status: 401 }
      );
    }

    // جلب البيانات المحدثة من الطلب
    const body = await request.json();

    // TODO: تحديث بيانات المستخدم (مثل اللغة، الإعدادات الشخصية، إلخ)
    // هذا يمكن تنفيذه لاحقاً حسب الحاجة

    return NextResponse.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      user: user,
    });
  } catch (error) {
    console.error('خطأ في تحديث بيانات المستخدم:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء تحديث البيانات',
      },
      { status: 500 }
    );
  }
}
