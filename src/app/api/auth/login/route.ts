/**
 * Mayas ERP - Auth Login API
 * API تسجيل الدخول
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api';
import { loginSchema } from '@/lib/validations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthAPI');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من البيانات
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const { username, password } = validation.data;

    // البحث عن المستخدم
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username },
        ],
        isActive: true,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        branchAccess: {
          include: {
            branch: true,
          },
        },
        warehouseAccess: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn('محاولة دخول فاشلة', { username });
      return errorResponse('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
    }

    // TODO: التحقق من كلمة المرور باستخدام bcrypt
    // const isValidPassword = await bcrypt.compare(password, user.password);
    // if (!isValidPassword) {
    //   return errorResponse('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
    // }

    // تحديث آخر تسجيل دخول
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // تسجيل نجاح الدخول
    logger.info('تسجيل دخول ناجح', { userId: user.id, username: user.username });

    // إرجاع بيانات المستخدم
    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        language: user.language,
        defaultBranchId: user.defaultBranchId,
        defaultWarehouseId: user.defaultWarehouseId,
      },
      roles: user.roles.map(ur => ({
        id: ur.role.id,
        code: ur.role.code,
        nameAr: ur.role.nameAr,
        nameEn: ur.role.nameEn,
      })),
      permissions: user.roles.flatMap(ur =>
        ur.role.permissions.map(rp => ({
          moduleKey: rp.permission.moduleKey,
          permissionKey: rp.permission.permissionKey,
        }))
      ),
      branches: user.branchAccess.map(ba => ({
        id: ba.branch.id,
        code: ba.branch.code,
        nameAr: ba.branch.nameAr,
        nameEn: ba.branch.nameEn,
      })),
      warehouses: user.warehouseAccess.map(wa => ({
        id: wa.warehouse.id,
        code: wa.warehouse.code,
        nameAr: wa.warehouse.nameAr,
        nameEn: wa.warehouse.nameEn,
      })),
    });
  } catch (error) {
    logger.error('خطأ في تسجيل الدخول', error as Error);
    return errorResponse('خطأ داخلي في الخادم', 500);
  }
}
