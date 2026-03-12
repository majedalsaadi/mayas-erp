# الوكيل 5: المصادقة والصلاحيات
## Auth / Permissions Agent

### 🎯 الدور
بناء نظام المصادقة والصلاحيات المتقدم

### 📋 المسؤوليات
1. تصميم نموذج المصادقة
2. تعريف الأدوار
3. تعريف الصلاحيات
4. تصميم صلاحيات الفروع
5. تصميم صلاحيات المستودعات
6. تصميم صلاحيات AI
7. تطبيق RLS

### 📤 المخرجات
1. **auth-and-permissions.md**
   - Authentication flow
   - Session management
   - Password policies
   - 2FA (optional)

2. **role-matrix.md**
   - Admin
   - Branch Manager
   - Accountant
   - Cashier
   - Warehouse Manager
   - Sales
   - Viewer

3. **ai-access-policy.md**
   - من يمكنه استخدام AI
   - ما يمكن قراءته
   - ما يمكن سؤاله

4. **Implementation**
   - Auth context
   - Permission hooks
   - RLS policies in SQL

### 📥 المدخلات المطلوبة
- permissions-matrix.md من الوكيل 1
- schema.prisma من الوكيل 3

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3
- يعمل بالتوازي مع: الوكيل 4, 11

### ⏱️ الوقت المتوقع
- 4-5 أيام

### ✅ معايير القبول
- [ ] نظام المصادقة يعمل
- [ ] جميع الأدوار معرفة
- [ ] جميع الصلاحيات معرفة
- [ ] RLS مطبقة
- [ ] صلاحيات AI واضحة

### 📂 مكان الملفات
```
src/
├── lib/
│   ├── auth.ts
│   ├── permissions.ts
│   └── rbac.ts
├── hooks/
│   ├── useAuth.ts
│   └── usePermissions.ts
└── components/
    └── auth/
        ├── LoginForm.tsx
        └── ProtectedRoute.tsx

prisma/
└── seeds/
    ├── roles.ts
    └── permissions.ts
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية
**المرحلة**: 2 - Design
