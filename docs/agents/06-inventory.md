# الوكيل 6: البيانات الأساسية والمخزون
## Master Data & Inventory Agent

### 🎯 الدور
بناء موديول الأصناف والمخزون الشامل

### 📋 المسؤوليات
1. إدارة الأصناف (Items)
   - إنشاء، تعديل، حذف
   - تصنيفات هرمية
   - باركود متعدد
   - بدائل
   - توافق مع السيارات

2. إدارة الأسعار
   - طبقات أسعار
   - أسعار خاصة للعملاء
   - أسعار الموردين

3. إدارة المخزون
   - رصيد لحظي
   - حركات المخزون
   - تحويلات
   - تسويات
   - جرد
   - حجز

### 📤 المخرجات
1. **inventory-module/**
   - Models
   - Services
   - API Routes
   - Components
   - Tests

2. **inventory-workflows.md**
   - تدفق الاستلام
   - تدفق التحويل
   - تدفق الجرد
   - تدفق التسوية

3. **inventory-apis.md**
   - POST /api/items
   - GET /api/items/:id
   - PUT /api/items/:id
   - GET /api/inventory/balances
   - POST /api/inventory/transfers
   - etc.

### 📥 المدخلات المطلوبة
- schema.prisma (جاهز)
- workflows من الوكيل 1

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3, 5
- يعمل بالتوازي مع: الوكيل 7, 8, 9, 10

### ⏱️ الوقت المتوقع
- 7-10 أيام

### ✅ معايير القبول
- [ ] CRUD الأصناف يعمل
- [ ] إدارة الباركود تعمل
- [ ] طبقات الأسعار تعمل
- [ ] الرصيد اللحظي صحيح
- [ ] التحويلات تعمل
- [ ] الجرد يعمل
- [ ] التسويات تعمل
- [ ] الحجز يعمل
- [ ] التقارير تعمل

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/inventory/
│   ├── items/
│   ├── categories/
│   ├── transfers/
│   ├── adjustments/
│   └── counts/
├── lib/
│   ├── inventory/
│   │   ├── items.ts
│   │   ├── stock.ts
│   │   ├── transfers.ts
│   │   └── adjustments.ts
└── components/
    └── inventory/
        ├── ItemForm.tsx
        ├── ItemList.tsx
        ├── StockBalance.tsx
        └── TransferForm.tsx
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية جداً
**المرحلة**: 4 - Master Data & Inventory
