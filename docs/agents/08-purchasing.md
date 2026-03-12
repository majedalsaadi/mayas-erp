# الوكيل 8: المشتريات
## Purchasing Agent

### 🎯 الدور
بناء موديول المشتريات والموردين

### 📋 المسؤوليات
1. طلبات الشراء (Purchase Requests)
2. أوامر الشراء (Purchase Orders)
3. فواتير الشراء (Purchase Invoices)
4. مردودات الشراء (Purchase Returns)
5. تكاليف الهبوط (Landed Costs)
6. إدارة الموردين

### 📤 المخرجات
1. **purchasing-module/**
   - Models
   - Services
   - API Routes
   - Components

2. **supplier-workflows.md**
   - تدفق الشراء
   - تدفق الاستلام
   - تدفق الدفع
   - المردودات

3. **landed-costs.md**
   - أنواع التكاليف
   - طرق التوزيع
   - تحديث التكلفة

### 📥 المدخلات المطلوبة
- schema.prisma
- workflows من الوكيل 1
- inventory module من الوكيل 6

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3, 5, 6
- يعمل بالتوازي مع: الوكيل 7, 9, 10

### ⏱️ الوقت المتوقع
- 7-10 أيام

### ✅ معايير القبول
- [ ] طلبات الشراء تعمل
- [ ] أوامر الشراء تعمل
- [ ] فواتير الشراء تعمل
- [ ] المردودات تعمل
- [ ] تكاليف الهبوط تعمل
- [ ] المخزون يُحدث تلقائياً
- [ ] القيود المحاسبية تُنشأ تلقائياً
- [ ] أرصدة الموردين صحيحة

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/purchasing/
│   ├── requests/
│   ├── orders/
│   ├── invoices/
│   ├── returns/
│   └── landed-costs/
├── lib/
│   └── purchasing/
│       ├── orders.ts
│       ├── invoices.ts
│       ├── returns.ts
│       └── landed-costs.ts
└── components/
    └── purchasing/
        ├── PurchaseOrderForm.tsx
        └── PurchaseInvoiceForm.tsx
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية
**المرحلة**: 5 - Sales / Purchasing / Accounting / Tax
