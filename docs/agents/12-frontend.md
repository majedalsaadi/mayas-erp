# الوكيل 12: الواجهات الأمامية
## Frontend Agent

### 🎯 الدور
بناء جميع واجهات المستخدم

### 📋 المسؤوليات
1. التصميم العام (Layout)
   - Sidebar
   - Header
   - Breadcrumbs
   - Theme (RTL, Dark Mode)

2. شاشات الإدارة
   - Company Settings
   - Branches
   - Warehouses
   - Users & Roles

3. شاشات المحاسبة
   - Chart of Accounts
   - Journal Entries
   - Financial Reports

4. شاشات المخزون
   - Items
   - Categories
   - Stock Balance
   - Transfers

5. شاشات المبيعات
   - Quotations
   - Orders
   - Invoices
   - Returns

6. شاشات POS
   - POS Screen
   - Shift Management
   - Receipt Printing

7. شاشات AI
   - Chat Interface
   - Settings

### 📤 المخرجات
1. **UI Implementation**
   - جميع الصفحات
   - جميع المكونات
   - RTL Support
   - Responsive Design

2. **print-templates/**
   - Invoice Template
   - Receipt Template
   - Reports Templates

3. **screens-spec.md**
   - مواصفات كل شاشة
   - User Flow
   - Wireframes

### 📥 المدخلات المطلوبة
- تصميمات UI (لو متوفرة)
- workflows من الوكيل 1
- جميع الموديولات من الوكلاء 6-11

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 6, 7, 8, 9, 10, 11
- يعمل بالتوازي مع: جميع الوكلاء

### ⏱️ الوقت المتوقع
- مستمر طوال المشروع (14-21 يوم فعلي)

### ✅ معايير القبول
- [ ] Layout الرئيسي يعمل
- [ ] RTL يعمل بشكل صحيح
- [ ] جميع الشاشات موجودة
- [ ] Responsive Design
- [ ] Accessibility
- [ ] الأداء جيد
- [ ] الطباعة تعمل
- [ ] التصميم متسق

### 📂 مكان الملفات
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchasing/
│   │   ├── accounting/
│   │   ├── tax/
│   │   └── settings/
│   └── (pos)/
│       └── pos/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   └── ...
│   └── [module]/
│       └── ...
└── styles/
    └── globals.css
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية
**المرحلة**: 3-6 (مستمر)
