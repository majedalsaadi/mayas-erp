# الوكيل 10: الضرائب و ZATCA
## Tax & ZATCA Agent

### 🎯 الدور
بناء نظام الضرائب والفواتير الإلكترونية

### 📋 المسؤوليات
1. أكواد الضرائب (Tax Codes)
2. حساب الضريبة (VAT Calculation)
3. الفواتير الإلكترونية (E-Invoicing)
   - QR Code
   - UUID
   - XML
   - Digital Signature
4. تكامل ZATCA
   - Clearance
   - Reporting
   - Onboarding
5. سجلات الضرائب

### 📤 المخرجات
1. **tax-module/**
   - Models
   - Services
   - API Routes
   - Components

2. **zatca-module/**
   - XML Generator
   - QR Generator
   - Signature
   - Submission
   - Status Tracking

3. **tax-workflows.md**
   - حساب الضريبة
   - الفواتير الخاضعة
   - الفواتير المعفاة
   - التقارير

4. **zatca-integration.md**
   - Phase 1 (Generation)
   - Phase 2 (Integration)
   - Compliance

### 📥 المدخلات المطلوبة
- schema.prisma
- متطلبات ZATCA
- accounting module من الوكيل 9

### 🔗 التبعيات
- يعتمد على: الوكيل 1, 2, 3, 5, 7, 9
- يعمل بعد: الوكيل 7, 9

### ⏱️ الوقت المتوقع
- 7-10 أيام

### ✅ معايير القبول
- [ ] أكواد الضرائب تعمل
- [ ] حساب الضريبة صحيح
- [ ] QR Code يُنشأ بشكل صحيح
- [ ] XML يتوافق مع ZATCA
- [ ] التوقيع الرقمي يعمل
- [ ] الإرسال لـ ZATCA يعمل
- [ ] تتبع الحالة يعمل
- [ ] التقارير الضريبية تعمل

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/tax/
│   ├── codes/
│   ├── invoices/
│   └── reports/
├── lib/
│   ├── tax/
│   │   ├── calculator.ts
│   │   └── reports.ts
│   └── zatca/
│       ├── xml-generator.ts
│       ├── qr-generator.ts
│       ├── signer.ts
│       └── submitter.ts
└── components/
    └── tax/
        ├── TaxCodeForm.tsx
        └── ZATCAStatus.tsx
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية جداً
**المرحلة**: 5 - Sales / Purchasing / Accounting / Tax
