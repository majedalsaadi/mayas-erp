# الوكيل 9: المحاسبة
## Accounting Agent

### 🎯 الدور
بناء النظام المحاسبي الشامل

### 📋 المسؤوليات
1. شجرة الحسابات (Chart of Accounts)
2. الأرصدة الافتتاحية (Opening Balances)
3. القيود اليومية (Journal Entries)
4. القيود الآلية (Auto Posting)
5. سندات القبض (Receipts)
6. سندات الصرف (Payments)
7. التسوية البنكية (Bank Reconciliation)
8. الإقفال الشهري/السنوي
9. التقارير المالية

### 📤 المخرجات
1. **accounting-module/**
   - Models
   - Services
   - API Routes
   - Components

2. **chart-of-accounts-seed.md**
   - شجرة حسابات جاهزة
   - للقطاع التجاري

3. **posting-engine/**
   - قواعد القيد الآلي
   - لكل نوع مستند

4. **financial-reports/**
   - ميزان المراجعة
   - قائمة الدخل
   - المركز المالي
   - التدفقات النقدية
   - الأستاذ العام

### 📥 المدخلات المطلوبة
- schema.prisma
- workflows من الوكيل 1
- القيود الآلية من master-plan.md

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3, 5
- يعمل بالتوازي مع: الوكيل 7, 8, 10

### ⏱️ الوقت المتوقع
- 10-14 يوم

### ✅ معايير القبول
- [ ] شجرة الحسابات تعمل
- [ ] الأرصدة الافتتاحية تعمل
- [ ] القيود اليومية تعمل
- [ ] القيود الآلية تعمل لكل المستندات
- [ ] سندات القبض تعمل
- [ ] سندات الصرف تعمل
- [ ] التسوية البنكية تعمل
- [ ] الإقفال يعمل
- [ ] جميع التقارير المالية تعمل
- [ ] الأرصدة صحيحة دائماً

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/accounting/
│   ├── chart-of-accounts/
│   ├── journal-entries/
│   ├── receipts/
│   ├── payments/
│   ├── bank-reconciliation/
│   └── reports/
├── lib/
│   └── accounting/
│       ├── accounts.ts
│       ├── journal.ts
│       ├── posting-engine.ts
│       ├── receipts.ts
│       ├── payments.ts
│       └── reports.ts
└── components/
    └── accounting/
        ├── AccountForm.tsx
        ├── JournalEntryForm.tsx
        └── FinancialReports.tsx
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية جداً
**المرحلة**: 5 - Sales / Purchasing / Accounting / Tax
