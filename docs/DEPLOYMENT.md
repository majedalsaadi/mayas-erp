# 🚀 دليل النشر - منصة مياس للمحاسبة

## ✅ المتطلبات

- حساب GitHub
- حساب Vercel
- حساب Supabase
- حساب Upstash (لـ Redis)
- حساب OpenRouter (لـ AI)
- حساب Resend (للبريد)

---

## 📦 خطوات النشر

### 1️⃣ إعداد GitHub

```bash
# إنشاء مستودع جديد على GitHub
# ثم:

git init
git add .
git commit -m "Initial commit - Mayas ERP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mayas-erp.git
git push -u origin main
```

---

### 2️⃣ إعداد Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. اختر منطقة قريبة (Europe West)
4. انتظر حتى يكتمل الإعداد (2-3 دقائق)

5. احصل على المفاتيح:
   - Settings > API > Project URL
   - Settings > API > anon public key
   - Settings > API > service_role key

6. شغّل السكربت:
```bash
node scripts/setup-supabase.js
```

---

### 3️⃣ إعداد Vercel

1. اذهب إلى [vercel.com](https://vercel.com)
2. سجل دخول باستخدام GitHub
3. انقر "New Project"
4. اختر مستودع mayas-erp
5. سيكتشف Vercel أنه مشروع Next.js تلقائياً

---

### 4️⃣ إضافة متغيرات البيئة

في Vercel، أضف المتغيرات التالية:

#### 필수 (مطلوب)
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SESSION_SECRET=xxx (32 حرف عشوائي)
```

#### 선택ي (للإنتاج)
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
OPENROUTER_API_KEY=xxx
RESEND_API_KEY=xxx
SENTRY_DSN=xxx
NEXT_PUBLIC_POSTHOG_KEY=xxx
```

---

### 5️⃣ النشر

```bash
# الطريقة 1: عبر Vercel CLI
npm i -g vercel
vercel --prod

# الطريقة 2: عبر GitHub
# سيتم النشر تلقائياً عند push لـ main
git push origin main
```

---

## 🔐 إعداد قاعدة البيانات

### بعد النشر الأول:

1. افتح Vercel Dashboard
2. اذهب إلى المشروع > Storage
3. أنشئ قاعدة بيانات PostgreSQL

أو استخدم Supabase:

```bash
# شغّل الهجرات
npx prisma migrate deploy

# زرع البيانات الأولية
npm run db:seed

# إنشاء مستخدم مدير
npm run create-admin
```

---

## ✅ قائمة التحقق

### قبل النشر:
- [ ] تم اختبار التطبيق محلياً
- [ ] جميع متغيرات البيئة جاهزة
- [ ] قاعدة البيانات جاهزة
- [ ] Storage buckets منشأة
- [ ] المفاتيح السرية آمنة

### بعد النشر:
- [ ] الموقع يعمل
- [ ] تسجيل الدخول يعمل
- [ ] قاعدة البيانات متصلة
- [ ] Storage يعمل
- [ ] APIs تعمل
- [ ] Sentry يسجل الأخطاء
- [ ] PostHog يسجل التحليلات

---

## 🔧 استكشاف الأخطاء

### خطأ في قاعدة البيانات:
```
Error: Can't reach database server
```
**الحل**: تأكد من صحة DATABASE_URL

### خطأ في Supabase:
```
Invalid API key
```
**الحل**: تأكد من صحة المفاتيح

### خطأ في البناء:
```
Build failed
```
**الحل**: راجع logs في Vercel

---

## 📊 مراقبة الإنتاج

### Sentry:
- راجع الأخطاء في sentry.io
- راقب الأداء

### PostHog:
- راجع التحليلات في app.posthog.com
- راقب سلوك المستخدمين

### Vercel Analytics:
- فعّل Analytics في Vercel
- راجع الزيارات والأداء

---

## 🔄 التحديثات

### نشر تحديث:
```bash
git add .
git commit -m "Update: description"
git push origin main
```

### نشر hotfix:
```bash
git checkout -b hotfix/fix-name
# أصلح المشكلة
git push origin hotfix/fix-name
# افتح Pull Request
```

---

## 🎉 مبروك!

مشروعك الآن على الإنترنت! 🌐

**الرابط**: `https://mayas-erp.vercel.app`

---

**آخر تحديث**: 2026-03-12
