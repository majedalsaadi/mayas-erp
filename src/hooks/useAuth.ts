/**
 * Mayas ERP - useAuth Hook
 * React Hook للمصادقة
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { AuthUser, LoginCredentials } from '@/lib/auth';

// ============================================
// Types
// ============================================

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * تحميل بيانات المستخدم الحالي
   */
  const loadUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات المستخدم:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * تحديث بيانات المستخدم
   */
  const refreshUser = useCallback(async () => {
    setLoading(true);
    await loadUser();
  }, [loadUser]);

  /**
   * تسجيل الدخول
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'حدث خطأ أثناء تسجيل الدخول' };
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * تسجيل الخروج
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * تحميل المستخدم عند بدء التطبيق
   */
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

/**
 * Hook للمصادقة
 * Use this hook to access authentication state and methods
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Hook للتحقق من حالة المصادقة فقط
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook للحصول على المستخدم الحالي فقط
 */
export function useCurrentUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook للتحقق من حالة التحميل
 */
export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}

/**
 * Hook مخصص للصفحات المحمية
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectUrl: string = '/login'): {
  user: AuthUser | null;
  loading: boolean;
} {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // حفظ الصفحة الحالية للعودة إليها بعد تسجيل الدخول
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = redirectUrl;
    }
  }, [user, loading, redirectUrl]);

  return { user, loading };
}

export default useAuth;
