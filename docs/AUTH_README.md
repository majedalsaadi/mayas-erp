# نظام المصادقة والصلاحيات - Mayas ERP

## 📋 نظرة عامة

نظام مصادقة وصلاحيات متكامل لمنصة مياس للمحاسبة مبني باستخدام:
- **Supabase Auth** - للمصادقة
- **JWT** - للجلسات
- **RBAC** - للصلاحيات
- **Prisma** - لقاعدة البيانات

## 🏗️ البنية

```
src/
├── lib/
│   └── auth.ts                    # نظام المصادقة الرئيسي
├── hooks/
│   ├── useAuth.ts                 # React Hook للمصادقة
│   └── usePermissions.ts          # React Hook للصلاحيات
├── middleware.ts                  # حماية الصفحات
├── app/
│   └── api/auth/
│       ├── login/route.ts         # API تسجيل الدخول
│       ├── logout/route.ts        # API تسجيل الخروج
│       └── me/route.ts            # API بيانات المستخدم الحالي
└── types/
    └── auth.ts                    # أنواع TypeScript
```

## 🚀 البدء السريع

### 1. إعداد متغيرات البيئة

أضف المتغيرات التالية إلى ملف `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session Secret
SESSION_SECRET=your-session-secret-change-this-in-production
```

### 2. تشغيل قاعدة البيانات

```bash
# إنشاء الجداول
npm run db:push

# أو تشغيل الهجرات
npm run db:migrate
```

### 3. إضافة الأدوار والصلاحيات الافتراضية

```bash
# تشغيل seed script
npx tsx prisma/seeds/roles-permissions.ts
```

### 4. إنشاء مستخدم افتراضي

```sql
-- إنشاء مستخدم في Supabase Auth
-- ثم إضافته في قاعدة البيانات:

INSERT INTO users (id, company_id, username, email, full_name, language)
VALUES (
  'uuid-from-supabase',
  'company-uuid',
  'admin',
  'admin@mayas.com',
  'مدير النظام',
  'ar'
);
```

## 📚 API Reference

### تسجيل الدخول

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@mayas.com",
    "username": "admin",
    "fullName": "مدير النظام",
    "companyId": "company-uuid",
    "language": "ar",
    "roles": ["admin"],
    "permissions": ["users:view", "users:create", ...]
  },
  "token": "jwt-token",
  "message": "تم تسجيل الدخول بنجاح"
}
```

### تسجيل الخروج

```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

### بيانات المستخدم الحالي

```http
GET /api/auth/me
Cookie: auth-token=jwt-token
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@mayas.com",
    "username": "admin",
    "fullName": "مدير النظام",
    "companyId": "company-uuid",
    "language": "ar",
    "roles": ["admin"],
    "permissions": ["users:view", "users:create", ...]
  }
}
```

## 🎣 React Hooks

### useAuth

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  if (loading) return <div>جاري التحميل...</div>;

  if (!isAuthenticated) {
    return (
      <button onClick={() => login({ username, password })}>
        تسجيل الدخول
      </button>
    );
  }

  return (
    <div>
      <p>مرحباً، {user?.fullName}</p>
      <button onClick={logout}>تسجيل الخروج</button>
    </div>
  );
}
```

### usePermissions

```tsx
import { usePermissions, MODULES, PERMISSIONS } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, is, isAdmin, hasPermission, hasRole } = usePermissions();

  return (
    <div>
      {/* التحقق من صلاحية */}
      {can(MODULES.USERS, PERMISSIONS.VIEW) && (
        <button>عرض المستخدمين</button>
      )}

      {/* التحقق من دور */}
      {is('admin') && (
        <button>لوحة الإدارة</button>
      )}

      {/* استخدام الدوال */}
      {hasPermission('sales', 'create') && (
        <button>إنشاء فاتورة</button>
      )}

      {hasRole('accountant') && (
        <div>لوحة المحاسب</div>
      )}

      {/* حالات خاصة */}
      {isAdmin && (
        <button>إعدادات متقدمة</button>
      )}
    </div>
  );
}
```

## 🔒 حماية الصفحات

### في المكونات

```tsx
import { useRequireAuth } from '@/hooks/useAuth';

function ProtectedPage() {
  const { user, loading } = useRequireAuth('/login');

  if (loading) return <div>جاري التحميل...</div>;

  return <div>محتوى محمي للمستخدم: {user?.fullName}</div>;
}
```

### في Middleware

```tsx
// src/middleware.ts
// المسارات المحمية معروفة في protectedPaths
const protectedPaths: Record<string, string[]> = {
  '/dashboard/users': ['users:view'],
  '/dashboard/sales': ['sales:view'],
  // ...
};
```

## 👥 الأدوار الافتراضية

| الدور | الوصف | الصلاحيات |
|-------|-------|----------|
| `super_admin` | مدير النظام | جميع الصلاحيات |
| `admin` | مدير | صلاحيات إدارية كاملة |
| `manager` | مدير فرع | صلاحيات على الفرع |
| `accountant` | محاسب | صلاحيات محاسبية |
| `salesperson` | مندوب مبيعات | صلاحيات المبيعات |
| `cashier` | كاشير | صلاحيات نقاط البيع |
| `warehouse_keeper` | أمين مستودع | صلاحيات المستودعات |
| `viewer` | مشاهد | مشاهدة فقط |

## 🔧 الصلاحيات المتاحة

### الوحدات (Modules)
- `users` - المستخدمون
- `roles` - الأدوار
- `companies` - الشركات
- `branches` - الفروع
- `warehouses` - المستودعات
- `items` - الأصناف
- `inventory` - المخزون
- `customers` - العملاء
- `suppliers` - الموردون
- `sales` - المبيعات
- `purchases` - المشتريات
- `pos` - نقاط البيع
- `accounting` - المحاسبة
- `reports` - التقارير
- `settings` - الإعدادات
- `ai` - الذكاء الاصطناعي

### أنواع الصلاحيات (Permission Types)
- `view` - عرض
- `create` - إنشاء
- `update` - تعديل
- `delete` - حذف
- `export` - تصدير
- `import` - استيراد
- `approve` - اعتماد
- `cancel` - إلغاء
- `print` - طباعة
- `manage` - إدارة كاملة

## 🧪 الاختبار

### صفحة الاختبار

تم إنشاء صفحة اختبار على المسار `/test-auth` لاختبار:
- تسجيل الدخول والخروج
- عرض معلومات المستخدم
- عرض الأدوار والصلاحيات
- اختبار صلاحيات محددة

### أمثلة اختبار

```typescript
// اختبار صلاحية
const hasViewUsers = can('users', 'view');
console.log('يمكن عرض المستخدمين:', hasViewUsers);

// اختبار دور
const isAdmin = is('admin');
console.log('هل هو مدير:', isAdmin);

// اختبار صلاحيات متعددة
const canManage = hasAllPermissions([
  { moduleKey: 'users', permissionKey: 'view' },
  { moduleKey: 'users', permissionKey: 'create' },
]);
console.log('يمكن إدارة المستخدمين:', canManage);
```

## 🌐 RTL والدعم العربي

- جميع الردود باللغة العربية
- النظام يدعم RTL بشكل كامل
- الأدوار والصلاحيات لها أسماء عربية وإنجليزية
- التواريخ والأوقات بالتوقيت المحلي (Asia/Riyadh)

## 🔐 الأمان

- كلمات المرور مشفرة في Supabase Auth
- JWT tokens مخزنة في cookies آمنة (httpOnly)
- Middleware يتحقق من الصلاحيات قبل الوصول للصفحات
- جميع الـ API routes محمية
- Headers أمنية مضافة في الـ middleware

## 📝 ملاحظات مهمة

1. **الجلسات**: الجلسة الافتراضية 24 ساعة، ويمكن تمديدها إلى 30 يوم مع "تذكرني"
2. **الأدوار**: يمكن تعيين أدوار متعددة للمستخدم الواحد
3. **الصلاحيات**: الصلاحيات تجمع من جميع أدوار المستخدم
4. **الشركات**: كل مستخدم ينتمي لشركة واحدة
5. **الفروع**: يمكن منح المستخدم صلاحيات على فروع محددة

## 🐛 استكشاف الأخطاء

### مشكلة: لا يمكن تسجيل الدخول

**الحلول:**
1. تأكد من إعداد Supabase بشكل صحيح
2. تأكد من وجود المستخدم في Supabase Auth
3. تأكد من وجود المستخدم في جدول `users`
4. تحقق من كلمة المرور

### مشكلة: الصلاحيات لا تظهر

**الحلول:**
1. تأكد من تشغيل seed script للأدوار والصلاحيات
2. تأكد من تعيين دور للمستخدم
3. تحقق من وجود صلاحيات للدور

### مشكلة: Middleware لا يعمل

**الحلول:**
1. تأكد من أن المسار غير في قائمة المسارات العامة
2. تحقق من صحة الـ matcher في config
3. راجع logs للتحقق من الأخطاء

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
- راجع التوثيق في `docs/`
- تحقق من الـ logs في console
- استخدم صفحة الاختبار `/test-auth`

---

**تطوير:** فريق تطوير منصة مياس للمحاسبة
**الإصدار:** 1.0.0
**التاريخ:** 2024
