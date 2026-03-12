# 🚀 دليل النشر السريع - منصة مياس

## ⚡ خطوات سريعة (15 دقيقة)

### 1️⃣ إنشاء الحسابات (5 دقائق)

| الخدمة | الرابط | المطلوب |
|--------|--------|---------|
| GitHub | github.com | مستودع جديد |
| Vercel | vercel.com | ربط GitHub |
| Supabase | supabase.com | مشروع جديد |
| Upstash | upstash.com | Redis مجاني |
| OpenRouter | openrouter.ai | API Key |

### 2️⃣ إعداد Supabase (3 دقائق)

```bash
# 1. انسخ المفاتيح من Supabase Dashboard
# Settings > API

# 2. شغّل السكربت
node scripts/setup-supabase.js

# 3. زرع البيانات
npx prisma db push
npx tsx prisma/seeds/main.ts
```

### 3️⃣ النشر على Vercel (5 دقائق)

```bash
# 1. ثبت Vercel CLI
npm i -g vercel

# 2. سجل دخول
vercel login

# 3. انشر
vercel --prod
```

### 4️⃣ إضافة متغيرات البيئة (2 دقيقة)

في Vercel Dashboard > Settings > Environment Variables:

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SESSION_SECRET=xxx
```

### 5️⃣ اختبار (1 دقيقة)

- افتح الرابط
- سجل دخول: admin / Admin@123
- جرب الميزات

---

## ✅ انتهيت!

**رابط موقعك**: `https://mayas-erp.vercel.app`

---

## 🆘 المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| خطأ في قاعدة البيانات | تأكد من DATABASE_URL |
| صفحة بيضاء | راجع logs في Vercel |
| خطأ 500 | تأكد من جميع المتغيرات |

---

**المزيد من التفاصيل**: `docs/DEPLOYMENT.md`
