# 📋 Checklist قبل النشر

## ✅ قاعدة البيانات

- [ ] إنشاء مشروع Supabase
- [ ] نسخ DATABASE_URL
- [ ] نسخ NEXT_PUBLIC_SUPABASE_URL
- [ ] نسخ NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] نسخ SUPABASE_SERVICE_ROLE_KEY
- [ ] شغّل `npx prisma db push`
- [ ] شغّل `npx tsx prisma/seeds/main.ts`
- [ ] شغّل `node scripts/setup-supabase.js`

## ✅ الخدمات الخارجية

- [ ] إنشاء حساب Upstash
- [ ] نسخ UPSTASH_REDIS_REST_URL
- [ ] نسخ UPSTASH_REDIS_REST_TOKEN
- [ ] إنشاء حساب OpenRouter
- [ ] نسخ OPENROUTER_API_KEY

## ✅ GitHub

- [ ] إنشاء مستودع جديد
- [ ] `git init`
- [ ] `git add .`
- [ ] `git commit -m "Initial commit"`
- [ ] `git remote add origin https://github.com/USER/mayas-erp.git`
- [ ] `git push -u origin main`

## ✅ Vercel

- [ ] ربط حساب GitHub
- [ ] استيراد المشروع
- [ ] إضافة متغيرات البيئة
- [ ] انقر Deploy
- [ ] انتظر البناء (2-3 دقائق)

## ✅ الإعدادات الأمنية

- [ ] توليد SESSION_SECRET (32 حرف)
- [ ] تعطيل التسجيل المفتوح (إذا مطلوب)
- [ ] إعداد Sentry للمراقبة
- [ ] إعداد PostHog للتحليلات

## ✅ ما بعد النشر

- [ ] اختبار تسجيل الدخول
- [ ] اختبار APIs
- [ ] اختبار Storage
- [ ] مراجعة Sentry للأخطاء
- [ ] إعداد Custom Domain (اختياري)

## ✅ ZATCA (اختياري)

- [ ] الحصول على شهادة ZATCA
- [ ] إعداد بيئة الاختبار
- [ ] اختبار الفواتير
- [ ] الانتقال للإنتاج

---

## 📊 المتغيرات المطلوبة

### إلزامي (بدونها لن يعمل)
```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
```

### اختياري (لكن مهم)
```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
OPENROUTER_API_KEY
RESEND_API_KEY
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
```

---

**بعد إكمال جميع البنود**: المشروع جاهز للإنتاج! 🎉
