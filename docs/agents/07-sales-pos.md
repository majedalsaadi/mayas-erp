# الوكيل 7: المبيعات ونقاط البيع
## Sales & POS Agent

### 🎯 الدور
بناء موديول المبيعات و POS

### 📋 المسؤوليات
1. عروض الأسعار (Quotations)
2. أوامر البيع (Sales Orders)
3. فواتير المبيعات (Sales Invoices)
4. مرتجعات المبيعات (Sales Returns)
5. نقاط البيع (POS)
   - شاشة البيع السريع
   - مسح الباركود
   - البحث السريع
   - تعليق الفاتورة
   - الورديات
   - الطباعة الحرارية

### 📤 المخرجات
1. **sales-module/**
   - Models
   - Services
   - API Routes
   - Components

2. **pos-module/**
   - POS Screen
   - Barcode Scanner
   - Payment Modal
   - Shift Management
   - Receipt Printing

3. **sales-workflows.md**
   - من عرض السعر للفاتورة
   - من الفاتورة للتحصيل
   - المرتجعات
   - الخصومات

4. **pricing-hierarchy.md**
   - سعر العميل الخاص
   - سعر المجموعة
   - سعر الطبقة
   - السعر الأساسي

### 📥 المدخلات المطلوبة
- schema.prisma
- workflows من الوكيل 1
- inventory module من الوكيل 6

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3, 5, 6
- يعمل بالتوازي مع: الوكيل 8, 9, 10

### ⏱️ الوقت المتوقع
- 10-14 يوم

### ✅ معايير القبول
- [ ] عروض الأسعار تعمل
- [ ] أوامر البيع تعمل
- [ ] الفواتير تعمل
- [ ] المرتجعات تعمل
- [ ] POS يعمل بكفاءة
- [ ] الورديات تعمل
- [ ] الطباعة تعمل
- [ ] الخصومات تعمل
- [ ] التسعير صحيح
- [ ] المخزون يُحدث تلقائياً
- [ ] القيود المحاسبية تُنشأ تلقائياً

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/sales/
│   ├── quotations/
│   ├── orders/
│   ├── invoices/
│   └── returns/
├── app/(pos)/
│   └── pos/
│       ├── page.tsx
│       └── shift/
├── lib/
│   ├── sales/
│   │   ├── quotations.ts
│   │   ├── orders.ts
│   │   ├── invoices.ts
│   │   └── returns.ts
│   └── pos/
│       ├── pos.ts
│       ├── shift.ts
│       └── print.ts
└── components/
    ├── sales/
    │   ├── InvoiceForm.tsx
    │   └── InvoiceList.tsx
    └── pos/
        ├── POSScreen.tsx
        ├── Cart.tsx
        ├── PaymentModal.tsx
        └── Receipt.tsx
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية جداً
**المرحلة**: 5 - Sales / Purchasing / Accounting / Tax
