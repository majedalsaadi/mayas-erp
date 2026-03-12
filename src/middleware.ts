/**
 * Mayas ERP - Middleware المحسن
 * حماية الصفحات والمسارات مع تحسينات الأداء والأمان
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// Configuration
// ============================================

/**
 * المسارات العامة (لا تتطلب مصادقة)
 */
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/ping',
];

/**
 * المسارات الثابتة (لا تتطلب مصادقة)
 */
const staticPaths = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/images',
  '/fonts',
  '/static',
  '/manifest.json',
];

/**
 * المسارات التي تتطلب صلاحيات خاصة
 */
const protectedPaths: Record<string, string[]> = {
  '/dashboard/users': ['users:view'],
  '/dashboard/roles': ['roles:view'],
  '/dashboard/companies': ['companies:view'],
  '/dashboard/branches': ['branches:view'],
  '/dashboard/warehouses': ['warehouses:view'],
  '/dashboard/items': ['items:view'],
  '/dashboard/inventory': ['inventory:view'],
  '/dashboard/customers': ['customers:view'],
  '/dashboard/suppliers': ['suppliers:view'],
  '/dashboard/sales': ['sales:view'],
  '/dashboard/purchases': ['purchases:view'],
  '/dashboard/pos': ['pos:view'],
  '/dashboard/accounting': ['accounting:view'],
  '/dashboard/reports': ['reports:view'],
  '/dashboard/settings': ['settings:view'],
  '/dashboard/ai': ['ai:view'],
  '/dashboard/admin': ['admin:full'],
};

/**
 * إعدادات Rate Limiting
 */
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  maxRequests: 100,
  whitelist: ['/api/health', '/api/ping'],
};

/**
 * تخزين Rate Limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * إعدادات الأمان
 */
const securityConfig = {
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
  hsts: 'max-age=31536000; includeSubDomains; preload',
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://api.mayas-accounting.com', 'wss://*.supabase.co'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * التحقق مما إذا كان المسار عام
 */
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * التحقق مما إذا كان المسار ثابت
 */
function isStaticPath(pathname: string): boolean {
  return staticPaths.some(path => pathname.startsWith(path));
}

/**
 * التحقق مما إذا كان المسار محمي
 */
function isProtectedPath(pathname: string): boolean {
  return Object.keys(protectedPaths).some(path => pathname.startsWith(path));
}

/**
 * الحصول على الصلاحيات المطلوبة للمسار
 */
function getRequiredPermissions(pathname: string): string[] {
  for (const [path, permissions] of Object.entries(protectedPaths)) {
    if (pathname.startsWith(path)) {
      return permissions;
    }
  }
  return [];
}

/**
 * التحقق من صلاحيات المستخدم
 */
async function checkUserPermissions(
  supabase: any,
  requiredPermissions: string[]
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }

    // TODO: استدعاء API للتحقق من الصلاحيات
    // هذا يمكن تحسينه لاحقاً باستخدام Redis أو JWT claims
    
    return true;
  } catch (error) {
    console.error('خطأ في التحقق من الصلاحيات:', error);
    return false;
  }
}

/**
 * Rate Limiting
 */
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
    });
    return { allowed: true, remaining: rateLimitConfig.maxRequests - 1 };
  }

  if (record.count >= rateLimitConfig.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: rateLimitConfig.maxRequests - record.count };
}

/**
 * تنظيف Rate Limiting Store
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * إنشاء CSP Header
 */
function generateCSP(): string {
  return Object.entries(securityConfig.csp)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

/**
 * إضافة رؤوس الأمان
 */
function addSecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP());
  
  // رؤوس الأمان الأخرى
  response.headers.set('X-Frame-Options', securityConfig.frameOptions);
  response.headers.set('X-Content-Type-Options', securityConfig.contentTypeOptions);
  response.headers.set('X-XSS-Protection', securityConfig.xssProtection);
  response.headers.set('Referrer-Policy', securityConfig.referrerPolicy);
  response.headers.set('Permissions-Policy', securityConfig.permissionsPolicy);
  response.headers.set('Strict-Transport-Security', securityConfig.hsts);
  
  // إزالة رأس X-Powered-By
  response.headers.delete('X-Powered-By');
}

/**
 * إضافة رؤوس الأداء
 */
function addPerformanceHeaders(response: NextResponse): void {
  // تفعيل Keep-Alive
  response.headers.set('Connection', 'keep-alive');
  response.headers.set('Keep-Alive', 'timeout=5, max=100');
  
  // تفعيل الضغط
  response.headers.set('Vary', 'Accept-Encoding');
}

/**
 * إضافة رؤوس CORS
 */
function addCorsHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://mayas-accounting.com',
    'https://www.mayas-accounting.com',
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }
}

/**
 * تسجيل الطلبات
 */
function logRequest(req: NextRequest, statusCode: number, duration: number): void {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.nextUrl.pathname,
    statusCode,
    duration: `${duration}ms`,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(log, null, 2));
  } else if (statusCode >= 400 || duration > 1000) {
    console.warn(JSON.stringify(log));
  }
}

/**
 * التحقق من IP المحظور
 */
function isBlockedIP(ip: string): boolean {
  const blockedIPs = (process.env.BLOCKED_IPS || '').split(',').filter(Boolean);
  return blockedIPs.includes(ip);
}

/**
 * التحقق من User Agent المشبوه
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /metasploit/i,
    /burpsuite/i,
    /scanner/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

// ============================================
// تنظيف دوري
// ============================================

// تنظيف Rate Limiting Store كل 5 دقائق
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

// ============================================
// Middleware
// ============================================

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const pathname = req.nextUrl.pathname;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // التحقق من IP المحظور
  if (isBlockedIP(ip)) {
    const response = new NextResponse('Forbidden', { status: 403 });
    addSecurityHeaders(response);
    logRequest(req, 403, Date.now() - startTime);
    return response;
  }

  // التحقق من User Agent المشبوه
  if (isSuspiciousUserAgent(userAgent)) {
    const response = new NextResponse('Forbidden', { status: 403 });
    addSecurityHeaders(response);
    logRequest(req, 403, Date.now() - startTime);
    return response;
  }

  // تجاهل المسارات الثابتة والعامة
  if (isStaticPath(pathname) || isPublicPath(pathname)) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    addPerformanceHeaders(response);
    logRequest(req, 200, Date.now() - startTime);
    return response;
  }

  // Rate Limiting (فقط للمسارات غير المدرجة في القائمة البيضاء)
  if (!rateLimitConfig.whitelist.includes(pathname)) {
    const rateLimitResult = checkRateLimit(ip);
    
    if (!rateLimitResult.allowed) {
      const response = new NextResponse('Too Many Requests', { status: 429 });
      addSecurityHeaders(response);
      response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('Retry-After', '900'); // 15 دقيقة
      logRequest(req, 429, Date.now() - startTime);
      return response;
    }
  }

  // معالجة طلبات OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    addSecurityHeaders(response);
    addCorsHeaders(response, req);
    return response;
  }

  // إنشاء عميل Supabase
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // التحقق من الجلسة
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // إذا لم يكن هناك جلسة والمسار ليس عام، توجيه إلى صفحة تسجيل الدخول
  if (!session && !isPublicPath(pathname)) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    const response = NextResponse.redirect(redirectUrl);
    addSecurityHeaders(response);
    logRequest(req, 302, Date.now() - startTime);
    return response;
  }

  // التحقق من الصلاحيات للمسارات المحمية
  if (session && isProtectedPath(pathname)) {
    const requiredPermissions = getRequiredPermissions(pathname);
    
    if (requiredPermissions.length > 0) {
      const hasPermission = await checkUserPermissions(supabase, requiredPermissions);
      
      if (!hasPermission) {
        // توجيه إلى صفحة عدم وجود صلاحية
        const redirectUrl = new URL('/unauthorized', req.url);
        const response = NextResponse.redirect(redirectUrl);
        addSecurityHeaders(response);
        logRequest(req, 302, Date.now() - startTime);
        return response;
      }
    }
  }

  // إضافة headers للأمان والأداء
  addSecurityHeaders(res);
  addPerformanceHeaders(res);
  addCorsHeaders(res, req);

  // إضافة معلومات المستخدم في headers (للاستخدام في API routes)
  if (session?.user) {
    res.headers.set('X-User-Id', session.user.id);
    res.headers.set('X-User-Email', session.user.email || '');
  }

  // إضافة Rate Limit headers
  const rateLimitResult = checkRateLimit(ip);
  res.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
  res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());

  // تسجيل الطلب
  logRequest(req, 200, Date.now() - startTime);

  return res;
}

// ============================================
// Matcher Configuration
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
