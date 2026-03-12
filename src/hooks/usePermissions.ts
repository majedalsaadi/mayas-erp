/**
 * Mayas ERP - usePermissions Hook
 * React Hook للصلاحيات (RBAC)
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { AuthUser } from '@/lib/auth';

// ============================================
// Types
// ============================================

export interface PermissionCheck {
  moduleKey: string;
  permissionKey: string;
}

export interface RoleCheck {
  roleCode: string;
}

// ============================================
// Main Hook
// ============================================

/**
 * Hook للتحقق من الصلاحيات
 * Use this hook to check user permissions and roles
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * التحقق من صلاحية معينة
   */
  const hasPermission = useCallback(
    (moduleKey: string, permissionKey: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(`${moduleKey}:${permissionKey}`);
    },
    [user]
  );

  /**
   * التحقق من عدة صلاحيات (يجب أن يمتلكها جميعاً)
   */
  const hasAllPermissions = useCallback(
    (permissions: PermissionCheck[]): boolean => {
      if (!user) return false;
      return permissions.every(({ moduleKey, permissionKey }) =>
        user.permissions.includes(`${moduleKey}:${permissionKey}`)
      );
    },
    [user]
  );

  /**
   * التحقق من عدة صلاحيات (يكفي امتلاك واحدة)
   */
  const hasAnyPermission = useCallback(
    (permissions: PermissionCheck[]): boolean => {
      if (!user) return false;
      return permissions.some(({ moduleKey, permissionKey }) =>
        user.permissions.includes(`${moduleKey}:${permissionKey}`)
      );
    },
    [user]
  );

  /**
   * التحقق من دور معين
   */
  const hasRole = useCallback(
    (roleCode: string): boolean => {
      if (!user) return false;
      return user.roles.includes(roleCode);
    },
    [user]
  );

  /**
   * التحقق من عدة أدوار (يجب أن يمتلكها جميعاً)
   */
  const hasAllRoles = useCallback(
    (roleCodes: string[]): boolean => {
      if (!user) return false;
      return roleCodes.every(role => user.roles.includes(role));
    },
    [user]
  );

  /**
   * التحقق من عدة أدوار (يكفي امتلاك واحدة)
   */
  const hasAnyRole = useCallback(
    (roleCodes: string[]): boolean => {
      if (!user) return false;
      return user.roles.some(role => roleCodes.includes(role));
    },
    [user]
  );

  /**
   * التحقق من صلاحية معينة وإرجاع عنصر أو null
   * مفيد للإخفاء الشرطي للعناصر
   */
  const can = useCallback(
    (moduleKey: string, permissionKey: string): boolean => {
      return hasPermission(moduleKey, permissionKey);
    },
    [hasPermission]
  );

  /**
   * التحقق من دور معين وإرجاع عنصر أو null
   * مفيد للإخفاء الشرطي للعناصر
   */
  const is = useCallback(
    (roleCode: string): boolean => {
      return hasRole(roleCode);
    },
    [hasRole]
  );

  /**
   * الحصول على جميع الصلاحيات
   */
  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user]);

  /**
   * الحصول على جميع الأدوار
   */
  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user]);

  /**
   * التحقق من ما إذا كان المستخدم مدير
   */
  const isAdmin = useMemo(() => {
    return hasRole('admin') || hasRole('super_admin');
  }, [hasRole]);

  /**
   * التحقق من ما إذا كان المستخدم مدير نظام
   */
  const isSuperAdmin = useMemo(() => {
    return hasRole('super_admin');
  }, [hasRole]);

  return {
    // الصلاحيات
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    can,

    // الأدوار
    hasRole,
    hasAllRoles,
    hasAnyRole,
    is,

    // البيانات
    permissions,
    roles,

    // الحالات الخاصة
    isAdmin,
    isSuperAdmin,
  };
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Hook للتحقق من صلاحية معينة فقط
 */
export function useHasPermission(
  moduleKey: string,
  permissionKey: string
): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(moduleKey, permissionKey);
}

/**
 * Hook للتحقق من دور معين فقط
 */
export function useHasRole(roleCode: string): boolean {
  const { hasRole } = usePermissions();
  return hasRole(roleCode);
}

/**
 * Hook للتحقق من ما إذا كان المستخدم مدير
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions();
  return isAdmin;
}

/**
 * Hook للتحقق من ما إذا كان المستخدم مدير نظام
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin;
}

// ============================================
// Permission Constants
// ============================================

/**
 * ثوابت الوحدات النمطية
 */
export const MODULES = {
  USERS: 'users',
  ROLES: 'roles',
  COMPANIES: 'companies',
  BRANCHES: 'branches',
  WAREHOUSES: 'warehouses',
  ITEMS: 'items',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  PURCHASES: 'purchases',
  POS: 'pos',
  ACCOUNTING: 'accounting',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  AI: 'ai',
} as const;

/**
 * ثوابت أنواع الصلاحيات
 */
export const PERMISSIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  APPROVE: 'approve',
  CANCEL: 'cancel',
  PRINT: 'print',
  MANAGE: 'manage',
} as const;

/**
 * ثوابت الأدوار
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  SALESPERSON: 'salesperson',
  CASHIER: 'cashier',
  WAREHOUSE_KEEPER: 'warehouse_keeper',
  VIEWER: 'viewer',
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * إنشاء مفتاح صلاحية
 */
export function createPermissionKey(
  moduleKey: string,
  permissionKey: string
): string {
  return `${moduleKey}:${permissionKey}`;
}

/**
 * تحليل مفتاح صلاحية
 */
export function parsePermissionKey(
  permissionKey: string
): { moduleKey: string; permissionKey: string } | null {
  const parts = permissionKey.split(':');
  if (parts.length !== 2) return null;
  return {
    moduleKey: parts[0],
    permissionKey: parts[1],
  };
}

export default usePermissions;
