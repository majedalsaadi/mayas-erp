# الوكيل 4: منصات و DevOps
## Platform / DevOps Agent

### 🎯 الدور
إعداد البنية التحتية وأدوات النشر

### 📋 المسؤوليات
1. إعداد GitHub Repository
2. إعداد استراتيجية الفروع
3. إعداد GitHub Actions
4. إعداد Vercel
5. إعداد Supabase
6. إعداد Cloudflare
7. إعداد Resend
8. إعداد Sentry
9. إعداد Upstash Redis
10. إعداد Trigger.dev/Inngest
11. إعداد PostHog
12. إدارة Secrets

### 📤 المخرجات
1. **infra.md**
   - قائمة بجميع الخدمات
   - تكلفة كل خدمة
   - الحسابات المطلوبة

2. **env-vars.md** ✅ (موجود .env.example)
   - جميع المتغيرات
   - وصف كل متغير
   - أين يُستخدم

3. **ci-cd.md**
   - Pipeline steps
   - Testing
   - Deployment
   - Rollback

4. **release-guide.md**
   - كيفية الإصدار
   - Version numbering
   - Changelog

### 📥 المدخلات المطلوبة
- architecture.md من الوكيل 2
- الحسابات (GitHub, Vercel, etc.) - لاحقاً

### 🔗 التبعيات
- يعتمد على: الوكيل 2
- يعمل بالتوازي مع: الوكيل 3, 5, 11

### ⏱️ الوقت المتوقع
- 3-4 أيام

### ✅ معايير القبول
- [ ] Repository جاهز
- [ ] CI/CD يعمل
- [ ] جميع الخدمات متصلة
- [ ] Secrets محمية
- [ ] Deployment يعمل

### 📂 مكان الملفات
```
.github/
├── workflows/
│   ├── ci.yml
│   ├── deploy-preview.yml
│   └── deploy-production.yml
├── ISSUE_TEMPLATE/
└── PULL_REQUEST_TEMPLATE.md

docs/
├── infra.md
├── ci-cd.md
└── release-guide.md
```

---

**الحالة**: 🟡 جاهز للبدء (محلياً)
**الأولوية**: متوسطة
**المرحلة**: 2 - Design
**ملاحظة**: يمكن البدء محلياً، السحاب لاحقاً
