/**
 * Mayas ERP - Environment Variables
 * التحقق من متغيرات البيئة
 */

import { z } from 'zod';

const envSchema = z.object({
  // قاعدة البيانات
  DATABASE_URL: z.string().url(),

  // التطبيق
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // AI
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Security
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ متغيرات البيئة غير صحيحة:');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
    
    // في التطوير، لا نوقف التطبيق
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ استخدام قيم افتراضية لبعض المتغيرات');
      return process.env as Env;
    }
    
    process.exit(1);
  }
}

export const env = validateEnv();

/**
 * فحص إذا كان المتغير موجود
 */
export function hasEnvVar(key: string): boolean {
  return !!process.env[key];
}

/**
 * الحصول على متغير مع قيمة افتراضية
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * فحص المتغيرات المطلوبة
 */
export function checkRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
