/**
 * Mayas ERP - Auth Types
 * أنواع TypeScript للمصادقة
 */

// ============================================
// User Types
// ============================================

/**
 * مستخدم المصادقة
 */
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

/**
 * بيانات تسجيل الدخول
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * نتيجة تسجيل الدخول
 */
export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

/**
 * بيانات الجلسة
 */
export interface SessionPayload {
  userId: string;
  email: string;
  companyId: string;
  iat: number;
  exp: number;
}

// ============================================
// Role & Permission Types
// ============================================

/**
 * دور المستخدم
 */
export interface Role {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
}

/**
 * صلاحية
 */
export interface Permission {
  id: string;
  moduleKey: string;
  permissionKey: string;
  nameAr: string;
  nameEn: string;
  description?: string;
}

/**
 * صلاحية الدور
 */
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  allowed: boolean;
  role?: Role;
  permission?: Permission;
}

/**
 * دور المستخدم
 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  user?: User;
  role?: Role;
}

// ============================================
// API Response Types
// ============================================

/**
 * رد API للمصادقة
 */
export interface AuthApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  user?: AuthUser;
  token?: string;
}

/**
 * رد API للمستخدم الحالي
 */
export interface CurrentUserResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * رد API لتسجيل الدخول
 */
export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  message?: string;
}

/**
 * رد API لتسجيل الخروج
 */
export interface LogoutResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// ============================================
// Context Types
// ============================================

/**
 * سياق المصادقة
 */
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * سياق الصلاحيات
 */
export interface PermissionsContextType {
  // الصلاحيات
  hasPermission: (moduleKey: string, permissionKey: string) => boolean;
  hasAllPermissions: (permissions: PermissionCheck[]) => boolean;
  hasAnyPermission: (permissions: PermissionCheck[]) => boolean;
  can: (moduleKey: string, permissionKey: string) => boolean;

  // الأدوار
  hasRole: (roleCode: string) => boolean;
  hasAllRoles: (roleCodes: string[]) => boolean;
  hasAnyRole: (roleCodes: string[]) => boolean;
  is: (roleCode: string) => boolean;

  // البيانات
  permissions: string[];
  roles: string[];

  // الحالات الخاصة
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * فحص الصلاحية
 */
export interface PermissionCheck {
  moduleKey: string;
  permissionKey: string;
}

/**
 * فحص الدور
 */
export interface RoleCheck {
  roleCode: string;
}

// ============================================
// Form Types
// ============================================

/**
 * نموذج تسجيل الدخول
 */
export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * نموذج التسجيل
 */
export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  companyId?: string;
}

/**
 * نموذج إعادة تعيين كلمة المرور
 */
export interface ResetPasswordForm {
  email: string;
}

/**
 * نموذج تغيير كلمة المرور
 */
export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============================================
// Hook Types
// ============================================

/**
 * خيارات useAuth
 */
export interface UseAuthOptions {
  redirectTo?: string;
  onLoginSuccess?: (user: AuthUser) => void;
  onLoginError?: (error: string) => void;
  onLogout?: () => void;
}

/**
 * خيارات usePermissions
 */
export interface UsePermissionsOptions {
  permissions?: PermissionCheck[];
  roles?: string[];
  requireAll?: boolean;
}

// ============================================
// Utility Types
// ============================================

/**
 * حالة المستخدم
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

/**
 * حالة الجلسة
 */
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * نوع المصادقة
 */
export type AuthProvider = 'email' | 'google' | 'microsoft' | 'apple';

/**
 * إعدادات الأمان
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // بالدقائق
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  lockoutDuration: number; // بالدقائق
}
