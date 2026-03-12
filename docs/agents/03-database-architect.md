# الوكيل 3: مهندس قاعدة البيانات
## Database Architect Agent

### 🎯 الدور
تصميم وبناء قاعدة البيانات الشاملة

### 📋 المسؤوليات
1. تصميم ERD (Entity Relationship Diagram)
2. كتابة Schema كامل
3. إنشاء الفهارس (Indexes)
4. إنشاء القيود (Constraints)
5. كتابة ملفات الهجرة (Migrations)
6. تصميم RLS (Row Level Security)
7. تصميم فهارس الـ AI (Vector Indexes)

### 📤 المخرجات
1. **database-spec.md** ✅ (موجود)
   - جميع الجداول
   - الحقول
   - العلاقات

2. **SQL Migrations**
   ```
   prisma/migrations/
   ├── 001_initial_setup/
   ├── 002_add_sales_tables/
   ├── 003_add_purchasing_tables/
   ├── 004_add_accounting_tables/
   └── 005_add_ai_tables/
   ```

3. **rls-policies.md**
   - سياسات الأمان لكل جدول
   - قواعد الوصول

4. **ai-indexing-schema.md**
   - فهارس الـ embeddings
   - جداول RAG

5. **seeds/**
   - شجرة الحسابات
   - الأدوار والصلاحيات
   - البيانات الأولية

### 📥 المدخلات المطلوبة
- database-spec.md (موجود)
- architecture.md من الوكيل 2

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2
- يعمل بالتوازي مع: الوكيل 4, 5, 11

### ⏱️ الوقت المتوقع
- 5-7 أيام

### ✅ معايير القبول
- [ ] جميع الجداول منشأة
- [ ] جميع العلاقات صحيحة
- [ ] الفهاس محسّنة
- [ ] RLS مطبقة
- [ ] Migrations تعمل
- [ ] Seeds جاهزة

### 📂 مكان الملفات
```
prisma/
├── schema.prisma ✅
├── migrations/
│   ├── 001_initial/
│   ├── 002_sales/
│   └── ...
└── seeds/
    ├── chart-of-accounts.ts
    ├── roles.ts
    └── permissions.ts
```

---

**الحالة**: 🟡 في التقدم (70% مكتمل)
**الأولوية**: عالية جداً
**المرحلة**: 2 - Design
