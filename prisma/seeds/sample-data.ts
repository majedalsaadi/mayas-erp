/**
 * Mayas ERP - Sample Data Generator
 * مولد بيانات تجريبية
 */

import { db } from '@/lib/db';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export async function generateSampleData() {
  console.log('📊 توليد بيانات تجريبية...\n');

  try {
    // 1. إنشاء فئات الأصناف
    console.log('📦 إنشاء فئات الأصناف...');
    const categories = await Promise.all([
      db.itemCategory.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CAT001',
          nameAr: 'زيوت المحركات',
          nameEn: 'Engine Oils',
          description: 'زيوت محركات متنوعة',
        },
      }),
      db.itemCategory.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CAT002',
          nameAr: 'فلاتر',
          nameEn: 'Filters',
          description: 'فلاتر هواء وزيت',
        },
      }),
      db.itemCategory.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CAT003',
          nameAr: 'فرامل',
          nameEn: 'Brakes',
          description: 'قطع الفرامل',
        },
      }),
      db.itemCategory.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CAT004',
          nameAr: 'بطاريات',
          nameEn: 'Batteries',
          description: 'بطاريات سيارات',
        },
      }),
    ]);
    console.log(`   ✅ ${categories.length} فئات\n`);

    // 2. إنشاء ماركات
    console.log('🏷️ إنشاء الماركات...');
    const brands = await Promise.all([
      db.brand.create({
        data: {
          companyId: COMPANY_ID,
          code: 'BRD001',
          nameAr: 'توتال',
          nameEn: 'Total',
        },
      }),
      db.brand.create({
        data: {
          companyId: COMPANY_ID,
          code: 'BRD002',
          nameAr: 'مان',
          nameEn: 'Mann',
        },
      }),
      db.brand.create({
        data: {
          companyId: COMPANY_ID,
          code: 'BRD003',
          nameAr: 'بوش',
          nameEn: 'Bosch',
        },
      }),
    ]);
    console.log(`   ✅ ${brands.length} ماركات\n`);

    // 3. إنشاء وحدات قياس
    console.log('📏 إنشاء وحدات القياس...');
    const units = await Promise.all([
      db.unitOfMeasure.create({
        data: {
          companyId: COMPANY_ID,
          code: 'PCS',
          nameAr: 'قطعة',
          nameEn: 'Piece',
          symbol: 'ق',
        },
      }),
      db.unitOfMeasure.create({
        data: {
          companyId: COMPANY_ID,
          code: 'LTR',
          nameAr: 'لتر',
          nameEn: 'Liter',
          symbol: 'ل',
        },
      }),
      db.unitOfMeasure.create({
        data: {
          companyId: COMPANY_ID,
          code: 'BOX',
          nameAr: 'علبة',
          nameEn: 'Box',
          symbol: 'ع',
        },
      }),
    ]);
    console.log(`   ✅ ${units.length} وحدات\n`);

    // 4. إنشاء أصناف
    console.log('📦 إنشاء الأصناف...');
    const items = await Promise.all([
      db.item.create({
        data: {
          companyId: COMPANY_ID,
          code: 'ITM001',
          nameAr: 'زيت محرك توتال 5W30',
          nameEn: 'Total Engine Oil 5W30',
          categoryId: categories[0].id,
          brandId: brands[0].id,
          unitId: units[1].id,
          itemType: 'STOCK',
          isActive: true,
          trackInventory: true,
        },
      }),
      db.item.create({
        data: {
          companyId: COMPANY_ID,
          code: 'ITM002',
          nameAr: 'فلتر زيت مان',
          nameEn: 'Mann Oil Filter',
          categoryId: categories[1].id,
          brandId: brands[1].id,
          unitId: units[0].id,
          itemType: 'STOCK',
          isActive: true,
          trackInventory: true,
        },
      }),
      db.item.create({
        data: {
          companyId: COMPANY_ID,
          code: 'ITM003',
          nameAr: 'طرمبة فرامل بوش',
          nameEn: 'Bosch Brake Pump',
          categoryId: categories[2].id,
          brandId: brands[2].id,
          unitId: units[0].id,
          itemType: 'STOCK',
          isActive: true,
          trackInventory: true,
        },
      }),
    ]);
    console.log(`   ✅ ${items.length} أصناف\n`);

    // 5. إنشاء عملاء
    console.log('👥 إنشاء العملاء...');
    const customers = await Promise.all([
      db.customer.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CUS001',
          nameAr: 'ورشة السعادة',
          nameEn: 'AlSaada Workshop',
          customerType: 'B2B',
          phone: '0500000001',
          email: 'info@alsaada.com',
          city: 'الرياض',
          creditLimit: 50000,
        },
      }),
      db.customer.create({
        data: {
          companyId: COMPANY_ID,
          code: 'CUS002',
          nameAr: 'محمد أحمد',
          nameEn: 'Mohammed Ahmed',
          customerType: 'B2C',
          phone: '0500000002',
          city: 'جدة',
          creditLimit: 5000,
        },
      }),
    ]);
    console.log(`   ✅ ${customers.length} عملاء\n`);

    // 6. إنشاء موردين
    console.log('🏭 إنشاء الموردين...');
    const suppliers = await Promise.all([
      db.supplier.create({
        data: {
          companyId: COMPANY_ID,
          code: 'SUP001',
          nameAr: 'شركة الخليج للقطع',
          nameEn: 'Gulf Parts Company',
          taxNumber: '300123456789003',
          phone: '0110000001',
          email: 'sales@gulfparts.com',
          city: 'الرياض',
          country: 'السعودية',
          currencyCode: 'SAR',
        },
      }),
    ]);
    console.log(`   ✅ ${suppliers.length} موردين\n`);

    console.log('✨ تم توليد البيانات التجريبية بنجاح!\n');
  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  }
}

// تشغيل السكربت
if (require.main === module) {
  generateSampleData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
