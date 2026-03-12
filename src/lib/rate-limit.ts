/**
 * Mayas ERP - Rate Limiting
 * تحديد معدل الطلبات
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env';

// إنشاء عميل Redis
const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// أنواع محددات المعدل
export const rateLimiters = {
  // عام - 100 طلب في الدقيقة
  general: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:general',
      })
    : null,

  // API - 60 طلب في الدقيقة
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:api',
      })
    : null,

  // تسجيل الدخول - 5 محاولات في الدقيقة
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:auth',
      })
    : null,

  // AI - 30 طلب في الدقيقة
  ai: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:ai',
      })
    : null,

  // البحث - 30 طلب في الدقيقة
  search: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:search',
      })
    : null,

  // التصدير - 10 طلبات في الدقيقة
  export: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'mayas:ratelimit:export',
      })
    : null,
};

/**
 * فحص معدل الطلبات
 */
export async function checkRateLimit(
  limiter: keyof typeof rateLimiters,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const rateLimit = rateLimiters[limiter];

  if (!rateLimit) {
    // إذا Redis غير متاح، اسمح بالطلب
    return {
      success: true,
      remaining: 999,
      reset: new Date(Date.now() + 60000),
    };
  }

  const result = await rateLimit.limit(identifier);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: new Date(result.reset),
  };
}

/**
 * الحصول على معرف العميل
 */
export function getClientIdentifier(request: Request): string {
  // استخدام IP إذا كان متاحاً
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // يمكن إضافة معرف المستخدم إذا كان مسجلاً
  return ip;
}
