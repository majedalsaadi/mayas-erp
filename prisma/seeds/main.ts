// البذور الرئيسي - Mayas ERP
// Main Seed File

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء زرع البيانات...');

  // 1. إنشاء شركة افتراضية
  const company = await prisma.company.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      code: 'MAYAS',
      nameAr: 'منصة مياس للمحاسبة',
      nameEn: 'Mayas Accounting Platform',
      legalNameAr: 'شركة مياس للحلول المحاسبية',
      legalNameEn: 'Mayas Accounting Solutions Company',
      taxNumber: '300000000000003',
      commercialRegistration: '1010000000',
      phone: '+966500000000',
      email: 'info@mayas-erp.com',
      website: 'https://mayas-erp.com',
      countryCode: 'SA',
      city: 'الرياض',
      district: 'حي النخيل',
      addressLine1: 'شارع الملك فهد',
      postalCode: '12345',
      currencyCode: 'SAR',
      languageDefault: 'ar',
      timezone: 'Asia/Riyadh',
      fiscalYearStartMonth: 1,
      isActive: true,
    },
  });
  console.log('✅ تم إنشاء الشركة:', company.nameAr);

  // 2. إنشاء فرع رئيسي
  const branch = await prisma.branch.create({
    data: {
      id: '00000000-0000-0000-0000-000000000002',
      companyId: company.id,
      code: 'HQ',
      nameAr: 'الفرع الرئيسي',
      nameEn: 'Headquarters',
      phone: '+966500000001',
      email: 'hq@mayas-erp.com',
      city: 'الرياض',
      address: 'شارع الملك فهد، حي النخيل',
      isMainBranch: true,
      isActive: true,
    },
  });
  console.log('✅ تم إنشاء الفرع:', branch.nameAr);

  // 3. إنشاء مستودع رئيسي
  const warehouse = await prisma.warehouse.create({
    data: {
      id: '00000000-0000-0000-0000-000000000003',
      companyId: company.id,
      branchId: branch.id,
      code: 'MAIN',
      nameAr: 'المستودع الرئيسي',
      nameEn: 'Main Warehouse',
      warehouseType: 'main',
      allowSales: true,
      allowPurchases: true,
      allowTransfers: true,
      isActive: true,
    },
  });
  console.log('✅ تم إنشاء المستودع:', warehouse.nameAr);

  // 4. إنشاء وحدة قياس افتراضية
  const unit = await prisma.unit.create({
    data: {
      companyId: company.id,
      code: 'PCS',
      nameAr: 'قطعة',
      nameEn: 'Piece',
      isFractionAllowed: false,
    },
  });
  console.log('✅ تم إنشاء وحدة القياس:', unit.nameAr);

  // 5. إنشاء صنف افتراضي
  const category = await prisma.itemCategory.create({
    data: {
      companyId: company.id,
      code: 'GEN',
      nameAr: 'أصناف عامة',
      nameEn: 'General Items',
      isActive: true,
    },
  });
  console.log('✅ تم إنشاء فئة الأصناف:', category.nameAr);

  // 6. إنشاء طبقة سعر افتراضية
  const priceTier = await prisma.priceTier.create({
    data: {
      companyId: company.id,
      code: 'DEFAULT',
      nameAr: 'السعر الأساسي',
      nameEn: 'Default Price',
      priority: 0,
      isDefault: true,
    },
  });
  console.log('✅ تم إنشاء طبقة السعر:', priceTier.nameAr);

  // 7. إنشاء كود ضريبي افتراضي
  const taxCode = await prisma.taxCode.create({
    data: {
      companyId: company.id,
      code: 'VAT15',
      nameAr: 'ضريبة القيمة المضافة 15%',
      nameEn: 'VAT 15%',
      rate: 15.0,
      taxType: 'VAT',
      zatcaCategory: 'S',
      isDefaultSales: true,
      isDefaultPurchase: true,
      isActive: true,
    },
  });
  console.log('✅ تم إنشاء كود الضريبة:', taxCode.nameAr);

  console.log('🎉 تم زرع جميع البيانات بنجاح!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في زرع البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
