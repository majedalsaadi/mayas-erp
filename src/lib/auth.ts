/**
 * Mayas ERP - Authentication System
 * نظام المصادقة - Supabase Auth + JWT + RBAC
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { User, Role, Permission } from '@/types';

// ============================================
// Supabase Client Configuration
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.SESSION_SECRET || 'mayas-erp-secret-change-in-production';

// عميل Supabase للمستخدمين العاديين
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// عميل Supabase للعمليات الإدارية
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  companyId: string;
  language: string;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  companyId: string;
  iat: number;
  exp: number;
}

// ============================================
// Authentication Functions
// ============================================

/**
 * تسجيل الدخول
 * Login with username/email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const { username, password } = credentials;

    // البحث عن المستخدم في قاعدة البيانات
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
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      };
    }

    // التحقق من كلمة المرور باستخدام Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      };
    }

    // جلب الصلاحيات
    const permissions = new Set<string>();
    const roleCodes: string[] = [];

    for (const userRole of user.roles) {
      roleCodes.push(userRole.role.code);
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.allowed) {
          permissions.add(`${rolePermission.permission.moduleKey}:${rolePermission.permission.permissionKey}`);
        }
      }
    }

    // إنشاء JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
      },
      jwtSecret,
      {
        expiresIn: credentials.rememberMe ? '30d' : '24h',
      }
    );

    // تحديث آخر تسجيل دخول
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      companyId: user.companyId,
      language: user.language,
      roles: roleCodes,
      permissions: Array.from(permissions),
    };

    return {
      success: true,
      user: authUser,
      token: token,
    };
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الدخول',
    };
  }
}

/**
 * تسجيل الخروج
 * Logout user
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        error: 'حدث خطأ أثناء تسجيل الخروج',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الخروج',
    };
  }
}

/**
 * الحصول على المستخدم الحالي
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // محاولة الحصول على الجلسة من Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    // جلب بيانات المستخدم من قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
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
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // جلب الصلاحيات
    const permissions = new Set<string>();
    const roleCodes: string[] = [];

    for (const userRole of user.roles) {
      roleCodes.push(userRole.role.code);
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.allowed) {
          permissions.add(`${rolePermission.permission.moduleKey}:${rolePermission.permission.permissionKey}`);
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      companyId: user.companyId,
      language: user.language,
      roles: roleCodes,
      permissions: Array.from(permissions),
    };
  } catch (error) {
    console.error('خطأ في الحصول على المستخدم الحالي:', error);
    return null;
  }
}

/**
 * التحقق من JWT Token
 * Verify JWT token
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret) as SessionPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * الحصول على المستخدم من Token
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = verifyToken(token);
    
    if (!payload) {
      return null;
    }

    // جلب بيانات المستخدم من قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // جلب الصلاحيات
    const permissions = new Set<string>();
    const roleCodes: string[] = [];

    for (const userRole of user.roles) {
      roleCodes.push(userRole.role.code);
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.allowed) {
          permissions.add(`${rolePermission.permission.moduleKey}:${rolePermission.permission.permissionKey}`);
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      companyId: user.companyId,
      language: user.language,
      roles: roleCodes,
      permissions: Array.from(permissions),
    };
  } catch (error) {
    console.error('خطأ في الحصول على المستخدم من Token:', error);
    return null;
  }
}

/**
 * إنشاء مستخدم جديد في Supabase Auth
 * Create new user in Supabase Auth
 */
export async function createAuthUser(
  email: string,
  password: string
): Promise<{ success: boolean; authUserId?: string; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      authUserId: data.user?.id,
    };
  } catch (error) {
    console.error('خطأ في إنشاء مستخدم المصادقة:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء المستخدم',
    };
  }
}

/**
 * تحديث كلمة المرور
 * Update user password
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'المستخدم غير موجود',
      };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.email,
      { password: newPassword }
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('خطأ في تحديث كلمة المرور:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث كلمة المرور',
    };
  }
}

/**
 * إعادة تعيين كلمة المرور
 * Reset password
 */
export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('خطأ في إعادة تعيين كلمة المرور:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
    };
  }
}

/**
 * التحقق من صلاحية معينة
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthUser | null,
  moduleKey: string,
  permissionKey: string
): boolean {
  if (!user) return false;
  return user.permissions.includes(`${moduleKey}:${permissionKey}`);
}

/**
 * التحقق من دور معين
 * Check if user has specific role
 */
export function hasRole(user: AuthUser | null, roleCode: string): boolean {
  if (!user) return false;
  return user.roles.includes(roleCode);
}

/**
 * التحقق من أي دور من الأدوار المحددة
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: AuthUser | null, roleCodes: string[]): boolean {
  if (!user) return false;
  return user.roles.some(role => roleCodes.includes(role));
}

/**
 * التحقق من جميع الأدوار المحددة
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: AuthUser | null, roleCodes: string[]): boolean {
  if (!user) return false;
  return roleCodes.every(role => user.roles.includes(role));
}

/**
 * الحصول على صلاحيات المستخدم من قاعدة البيانات
 * Get user permissions from database
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
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
    });

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.allowed) {
          permissions.add(
            `${rolePermission.permission.moduleKey}:${rolePermission.permission.permissionKey}`
          );
        }
      }
    }

    return Array.from(permissions);
  } catch (error) {
    console.error('خطأ في الحصول على صلاحيات المستخدم:', error);
    return [];
  }
}
