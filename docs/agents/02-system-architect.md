# الوكيل 2: مهندس النظام
## System Architect Agent

### 🎯 الدور
تصميم البنية التقنية الشاملة للنظام

### 📋 المسؤوليات
1. رسم المعمارية العامة للنظام
2. تحديد حدود الخدمات (Service Boundaries)
3. تحديد مسؤوليات كل طبقة
4. تصميم نموذج الأمان
5. تصميم معمارية الذكاء الاصطناعي

### 📤 المخرجات
1. **architecture.md**
   - رسم بياني للنظام
   - الطبقات (Frontend, Backend, Database, AI)
   - تدفق البيانات
   - الاتصالات بين الخدمات

2. **runtime-topology.md**
   - أين يعمل كل جزء
   - Vercel (Next.js)
   - Supabase (PostgreSQL, Auth, Storage)
   - Upstash (Redis)
   - Trigger.dev (Background Jobs)

3. **service-boundaries.md**
   - كل خدمة مسؤولة عن ماذا
   - API boundaries
   - Data boundaries

4. **deployment-topology.md**
   - Development environment
   - Staging environment
   - Production environment

5. **security-architecture.md**
   - Authentication flow
   - Authorization model
   - Data encryption
   - API security

### 📥 المدخلات المطلوبة
- PRD من الوكيل 1
- المستندات الثلاثة

### 🔗 التبعيات
- يعتمد على: الوكيل 1 (Product Analyst)
- يعمل بالتوازي مع: الوكيل 3, 4, 5, 11

### ⏱️ الوقت المتوقع
- 2-3 أيام

### ✅ معايير القبول
- [ ] معمارية واضحة وقابلة للتوسع
- [ ] جميع الطبقات محددة
- [ ] نموذج الأمان مصمم
- [ ] خطة النشر واضحة

### 📂 مكان الملفات
```
docs/
├── architecture/
│   ├── system-architecture.md
│   ├── runtime-topology.md
│   ├── service-boundaries.md
│   ├── deployment-topology.md
│   └── security-architecture.md
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية
**المرحلة**: 1 - Discovery
