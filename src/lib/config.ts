/**
 * Mayas ERP - Configuration
 * إعدادات النظام
 */

export const config = {
  // معلومات التطبيق
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'منصة مياس للمحاسبة',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    version: '0.1.0',
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en'],
  },

  // قاعدة البيانات
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Redis
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  // OpenRouter AI
  ai: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4-turbo',
    maxTokens: 4000,
    temperature: 0.7,
  },

  // البريد الإلكتروني
  email: {
    provider: 'resend',
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@mayas-erp.com',
  },

  // المراقبة
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  // الأمان
  security: {
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
    sessionSecret: process.env.SESSION_SECRET,
    jwtExpiresIn: '7d',
    bcryptRounds: 10,
  },

  // الوظائف الخلفية
  jobs: {
    provider: process.env.JOBS_PROVIDER || 'trigger',
    triggerSecret: process.env.TRIGGER_SECRET_KEY,
    inngestEventKey: process.env.INNGEST_EVENT_KEY,
  },

  // حدود النظام
  limits: {
    maxItemsPerInvoice: 100,
    maxInvoiceAmount: 10_000_000, // 10 مليون
    maxDiscountPercent: 100,
    maxCreditLimit: 1_000_000, // 1 مليون
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxExportRows: 10_000,
    pageSizeDefault: 20,
    pageSizeMax: 100,
  },

  // افتراضيات
  defaults: {
    currency: 'SAR',
    language: 'ar',
    timezone: 'Asia/Riyadh',
    taxRate: 15, // 15% VAT
    creditDays: 30,
    fiscalYearStart: 1, // January
  },

  // أنماط التحقق
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneSA: /^(\+966|966|0)?5\d{8}$/,
    taxNumberSA: /^3\d{14}$/,
    commercialReg: /^\d{10}$/,
    username: /^[a-zA-Z0-9_]{3,20}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  },
};

export type Config = typeof config;
