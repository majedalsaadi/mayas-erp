/**
 * Mayas ERP - Roles & Permissions Seed
 * بيانات الأدوار والصلاحيات الافتراضية
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// الصلاحيات الافتراضية
// ============================================

const defaultPermissions = [
  // المستخدمون
  { moduleKey: 'users', permissionKey: 'view', nameAr: 'عرض المستخدمين', nameEn: 'View Users' },
  { moduleKey: 'users', permissionKey: 'create', nameAr: 'إنشاء مستخدم', nameEn: 'Create User' },
  { moduleKey: 'users', permissionKey: 'update', nameAr: 'تعديل مستخدم', nameEn: 'Update User' },
  { moduleKey: 'users', permissionKey: 'delete', nameAr: 'حذف مستخدم', nameEn: 'Delete User' },
  { moduleKey: 'users', permissionKey: 'manage', nameAr: 'إدارة المستخدمين', nameEn: 'Manage Users' },

  // الأدوار
  { moduleKey: 'roles', permissionKey: 'view', nameAr: 'عرض الأدوار', nameEn: 'View Roles' },
  { moduleKey: 'roles', permissionKey: 'create', nameAr: 'إنشاء دور', nameEn: 'Create Role' },
  { moduleKey: 'roles', permissionKey: 'update', nameAr: 'تعديل دور', nameEn: 'Update Role' },
  { moduleKey: 'roles', permissionKey: 'delete', nameAr: 'حذف دور', nameEn: 'Delete Role' },
  { moduleKey: 'roles', permissionKey: 'manage', nameAr: 'إدارة الأدوار', nameEn: 'Manage Roles' },

  // الشركات
  { moduleKey: 'companies', permissionKey: 'view', nameAr: 'عرض الشركات', nameEn: 'View Companies' },
  { moduleKey: 'companies', permissionKey: 'update', nameAr: 'تعديل الشركة', nameEn: 'Update Company' },
  { moduleKey: 'companies', permissionKey: 'manage', nameAr: 'إدارة الشركة', nameEn: 'Manage Company' },

  // الفروع
  { moduleKey: 'branches', permissionKey: 'view', nameAr: 'عرض الفروع', nameEn: 'View Branches' },
  { moduleKey: 'branches', permissionKey: 'create', nameAr: 'إنشاء فرع', nameEn: 'Create Branch' },
  { moduleKey: 'branches', permissionKey: 'update', nameAr: 'تعديل فرع', nameEn: 'Update Branch' },
  { moduleKey: 'branches', permissionKey: 'delete', nameAr: 'حذف فرع', nameEn: 'Delete Branch' },
  { moduleKey: 'branches', permissionKey: 'manage', nameAr: 'إدارة الفروع', nameEn: 'Manage Branches' },

  // المستودعات
  { moduleKey: 'warehouses', permissionKey: 'view', nameAr: 'عرض المستودعات', nameEn: 'View Warehouses' },
  { moduleKey: 'warehouses', permissionKey: 'create', nameAr: 'إنشاء مستودع', nameEn: 'Create Warehouse' },
  { moduleKey: 'warehouses', permissionKey: 'update', nameAr: 'تعديل مستودع', nameEn: 'Update Warehouse' },
  { moduleKey: 'warehouses', permissionKey: 'delete', nameAr: 'حذف مستودع', nameEn: 'Delete Warehouse' },
  { moduleKey: 'warehouses', permissionKey: 'manage', nameAr: 'إدارة المستودعات', nameEn: 'Manage Warehouses' },

  // الأصناف
  { moduleKey: 'items', permissionKey: 'view', nameAr: 'عرض الأصناف', nameEn: 'View Items' },
  { moduleKey: 'items', permissionKey: 'create', nameAr: 'إنشاء صنف', nameEn: 'Create Item' },
  { moduleKey: 'items', permissionKey: 'update', nameAr: 'تعديل صنف', nameEn: 'Update Item' },
  { moduleKey: 'items', permissionKey: 'delete', nameAr: 'حذف صنف', nameEn: 'Delete Item' },
  { moduleKey: 'items', permissionKey: 'export', nameAr: 'تصدير الأصناف', nameEn: 'Export Items' },
  { moduleKey: 'items', permissionKey: 'import', nameAr: 'استيراد الأصناف', nameEn: 'Import Items' },
  { moduleKey: 'items', permissionKey: 'manage', nameAr: 'إدارة الأصناف', nameEn: 'Manage Items' },

  // المخزون
  { moduleKey: 'inventory', permissionKey: 'view', nameAr: 'عرض المخزون', nameEn: 'View Inventory' },
  { moduleKey: 'inventory', permissionKey: 'adjust', nameAr: 'تعديل المخزون', nameEn: 'Adjust Inventory' },
  { moduleKey: 'inventory', permissionKey: 'transfer', nameAr: 'نقل المخزون', nameEn: 'Transfer Inventory' },
  { moduleKey: 'inventory', permissionKey: 'manage', nameAr: 'إدارة المخزون', nameEn: 'Manage Inventory' },

  // العملاء
  { moduleKey: 'customers', permissionKey: 'view', nameAr: 'عرض العملاء', nameEn: 'View Customers' },
  { moduleKey: 'customers', permissionKey: 'create', nameAr: 'إنشاء عميل', nameEn: 'Create Customer' },
  { moduleKey: 'customers', permissionKey: 'update', nameAr: 'تعديل عميل', nameEn: 'Update Customer' },
  { moduleKey: 'customers', permissionKey: 'delete', nameAr: 'حذف عميل', nameEn: 'Delete Customer' },
  { moduleKey: 'customers', permissionKey: 'manage', nameAr: 'إدارة العملاء', nameEn: 'Manage Customers' },

  // الموردون
  { moduleKey: 'suppliers', permissionKey: 'view', nameAr: 'عرض الموردين', nameEn: 'View Suppliers' },
  { moduleKey: 'suppliers', permissionKey: 'create', nameAr: 'إنشاء مورد', nameEn: 'Create Supplier' },
  { moduleKey: 'suppliers', permissionKey: 'update', nameAr: 'تعديل مورد', nameEn: 'Update Supplier' },
  { moduleKey: 'suppliers', permissionKey: 'delete', nameAr: 'حذف مورد', nameEn: 'Delete Supplier' },
  { moduleKey: 'suppliers', permissionKey: 'manage', nameAr: 'إدارة الموردين', nameEn: 'Manage Suppliers' },

  // المبيعات
  { moduleKey: 'sales', permissionKey: 'view', nameAr: 'عرض المبيعات', nameEn: 'View Sales' },
  { moduleKey: 'sales', permissionKey: 'create', nameAr: 'إنشاء فاتورة بيع', nameEn: 'Create Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'update', nameAr: 'تعديل فاتورة بيع', nameEn: 'Update Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'delete', nameAr: 'حذف فاتورة بيع', nameEn: 'Delete Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'approve', nameAr: 'اعتماد فاتورة بيع', nameEn: 'Approve Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'cancel', nameAr: 'إلغاء فاتورة بيع', nameEn: 'Cancel Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'print', nameAr: 'طباعة فاتورة بيع', nameEn: 'Print Sales Invoice' },
  { moduleKey: 'sales', permissionKey: 'manage', nameAr: 'إدارة المبيعات', nameEn: 'Manage Sales' },

  // المشتريات
  { moduleKey: 'purchases', permissionKey: 'view', nameAr: 'عرض المشتريات', nameEn: 'View Purchases' },
  { moduleKey: 'purchases', permissionKey: 'create', nameAr: 'إنشاء فاتورة شراء', nameEn: 'Create Purchase Invoice' },
  { moduleKey: 'purchases', permissionKey: 'update', nameAr: 'تعديل فاتورة شراء', nameEn: 'Update Purchase Invoice' },
  { moduleKey: 'purchases', permissionKey: 'delete', nameAr: 'حذف فاتورة شراء', nameEn: 'Delete Purchase Invoice' },
  { moduleKey: 'purchases', permissionKey: 'approve', nameAr: 'اعتماد فاتورة شراء', nameEn: 'Approve Purchase Invoice' },
  { moduleKey: 'purchases', permissionKey: 'cancel', nameAr: 'إلغاء فاتورة شراء', nameEn: 'Cancel Purchase Invoice' },
  { moduleKey: 'purchases', permissionKey: 'manage', nameAr: 'إدارة المشتريات', nameEn: 'Manage Purchases' },

  // نقاط البيع
  { moduleKey: 'pos', permissionKey: 'view', nameAr: 'عرض نقاط البيع', nameEn: 'View POS' },
  { moduleKey: 'pos', permissionKey: 'create', nameAr: 'إنشاء نقطة بيع', nameEn: 'Create POS' },
  { moduleKey: 'pos', permissionKey: 'update', nameAr: 'تعديل نقطة بيع', nameEn: 'Update POS' },
  { moduleKey: 'pos', permissionKey: 'delete', nameAr: 'حذف نقطة بيع', nameEn: 'Delete POS' },
  { moduleKey: 'pos', permissionKey: 'manage', nameAr: 'إدارة نقاط البيع', nameEn: 'Manage POS' },

  // المحاسبة
  { moduleKey: 'accounting', permissionKey: 'view', nameAr: 'عرض المحاسبة', nameEn: 'View Accounting' },
  { moduleKey: 'accounting', permissionKey: 'create', nameAr: 'إنشاء قيد محاسبي', nameEn: 'Create Journal Entry' },
  { moduleKey: 'accounting', permissionKey: 'update', nameAr: 'تعديل قيد محاسبي', nameEn: 'Update Journal Entry' },
  { moduleKey: 'accounting', permissionKey: 'delete', nameAr: 'حذف قيد محاسبي', nameEn: 'Delete Journal Entry' },
  { moduleKey: 'accounting', permissionKey: 'approve', nameAr: 'اعتماد قيد محاسبي', nameEn: 'Approve Journal Entry' },
  { moduleKey: 'accounting', permissionKey: 'manage', nameAr: 'إدارة المحاسبة', nameEn: 'Manage Accounting' },

  // التقارير
  { moduleKey: 'reports', permissionKey: 'view', nameAr: 'عرض التقارير', nameEn: 'View Reports' },
  { moduleKey: 'reports', permissionKey: 'export', nameAr: 'تصدير التقارير', nameEn: 'Export Reports' },
  { moduleKey: 'reports', permissionKey: 'print', nameAr: 'طباعة التقارير', nameEn: 'Print Reports' },
  { moduleKey: 'reports', permissionKey: 'manage', nameAr: 'إدارة التقارير', nameEn: 'Manage Reports' },

  // الإعدادات
  { moduleKey: 'settings', permissionKey: 'view', nameAr: 'عرض الإعدادات', nameEn: 'View Settings' },
  { moduleKey: 'settings', permissionKey: 'update', nameAr: 'تعديل الإعدادات', nameEn: 'Update Settings' },
  { moduleKey: 'settings', permissionKey: 'manage', nameAr: 'إدارة الإعدادات', nameEn: 'Manage Settings' },

  // الذكاء الاصطناعي
  { moduleKey: 'ai', permissionKey: 'view', nameAr: 'عرض الذكاء الاصطناعي', nameEn: 'View AI' },
  { moduleKey: 'ai', permissionKey: 'use', nameAr: 'استخدام الذكاء الاصطناعي', nameEn: 'Use AI' },
  { moduleKey: 'ai', permissionKey: 'manage', nameAr: 'إدارة الذكاء الاصطناعي', nameEn: 'Manage AI' },
];

// ============================================
// الأدوار الافتراضية
// ============================================

const defaultRoles = [
  {
    code: 'super_admin',
    nameAr: 'مدير النظام',
    nameEn: 'Super Admin',
    isSystemRole: true,
    description: 'صلاحيات كاملة على جميع أجزاء النظام',
    permissions: ['*'], // جميع الصلاحيات
  },
  {
    code: 'admin',
    nameAr: 'مدير',
    nameEn: 'Admin',
    isSystemRole: true,
    description: 'صلاحيات إدارية كاملة على الشركة',
    permissions: [
      'users:*', 'roles:*', 'companies:*', 'branches:*', 'warehouses:*',
      'items:*', 'inventory:*', 'customers:*', 'suppliers:*',
      'sales:*', 'purchases:*', 'pos:*', 'accounting:*',
      'reports:*', 'settings:*', 'ai:*',
    ],
  },
  {
    code: 'manager',
    nameAr: 'مدير فرع',
    nameEn: 'Branch Manager',
    isSystemRole: false,
    description: 'صلاحيات إدارية على الفرع',
    permissions: [
      'users:view', 'users:update',
      'branches:view',
      'warehouses:view', 'warehouses:update',
      'items:*', 'inventory:*', 'customers:*', 'suppliers:view',
      'sales:*', 'purchases:view', 'pos:*', 'accounting:view',
      'reports:*', 'settings:view', 'ai:view',
    ],
  },
  {
    code: 'accountant',
    nameAr: 'محاسب',
    nameEn: 'Accountant',
    isSystemRole: false,
    description: 'صلاحيات محاسبية',
    permissions: [
      'items:view', 'inventory:view', 'customers:view', 'suppliers:view',
      'sales:view', 'sales:approve', 'purchases:view', 'purchases:approve',
      'accounting:*', 'reports:*', 'ai:view',
    ],
  },
  {
    code: 'salesperson',
    nameAr: 'مندوب مبيعات',
    nameEn: 'Salesperson',
    isSystemRole: false,
    description: 'صلاحيات المبيعات',
    permissions: [
      'items:view', 'inventory:view', 'customers:*',
      'sales:*', 'pos:view', 'reports:view', 'ai:view',
    ],
  },
  {
    code: 'cashier',
    nameAr: 'كاشير',
    nameEn: 'Cashier',
    isSystemRole: false,
    description: 'صلاحيات نقاط البيع',
    permissions: [
      'items:view', 'customers:view',
      'pos:*', 'reports:view',
    ],
  },
  {
    code: 'warehouse_keeper',
    nameAr: 'أمين مستودع',
    nameEn: 'Warehouse Keeper',
    isSystemRole: false,
    description: 'صلاحيات المستودعات',
    permissions: [
      'items:view', 'items:update',
      'inventory:*', 'warehouses:view',
      'reports:view',
    ],
  },
  {
    code: 'viewer',
    nameAr: 'مشاهد',
    nameEn: 'Viewer',
    isSystemRole: false,
    description: 'صلاحيات مشاهدة فقط',
    permissions: [
      'items:view', 'inventory:view', 'customers:view', 'suppliers:view',
      'sales:view', 'purchases:view', 'accounting:view',
      'reports:view', 'settings:view',
    ],
  },
];

// ============================================
// Seed Function
// ============================================

async function main() {
  console.log('🚀 بدء إضافة الأدوار والصلاحيات الافتراضية...\n');

  // 1. إضافة الصلاحيات
  console.log('📋 إضافة الصلاحيات...');
  for (const permission of defaultPermissions) {
    await prisma.permission.upsert({
      where: {
        moduleKey_permissionKey: {
          moduleKey: permission.moduleKey,
          permissionKey: permission.permissionKey,
        },
      },
      update: {
        nameAr: permission.nameAr,
        nameEn: permission.nameEn,
      },
      create: {
        moduleKey: permission.moduleKey,
        permissionKey: permission.permissionKey,
        nameAr: permission.nameAr,
        nameEn: permission.nameEn,
      },
    });
  }
  console.log(`✅ تم إضافة ${defaultPermissions.length} صلاحية\n`);

  // 2. إضافة شركة افتراضية (إذا لم تكن موجودة)
  console.log('🏢 إضافة الشركة الافتراضية...');
  const company = await prisma.company.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      nameAr: 'الشركة الافتراضية',
      nameEn: 'Default Company',
      currencyCode: 'SAR',
      languageDefault: 'ar',
      timezone: 'Asia/Riyadh',
    },
  });
  console.log(`✅ تم إضافة الشركة: ${company.nameAr}\n`);

  // 3. إضافة الأدوار
  console.log('👥 إضافة الأدوار...');
  for (const role of defaultRoles) {
    const createdRole = await prisma.role.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: role.code,
        },
      },
      update: {
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        isSystemRole: role.isSystemRole,
      },
      create: {
        companyId: company.id,
        code: role.code,
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        isSystemRole: role.isSystemRole,
      },
    });

    // إضافة صلاحيات الدور
    if (role.permissions.includes('*')) {
      // جميع الصلاحيات
      const allPermissions = await prisma.permission.findMany();
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: createdRole.id,
              permissionId: permission.id,
            },
          },
          update: { allowed: true },
          create: {
            roleId: createdRole.id,
            permissionId: permission.id,
            allowed: true,
          },
        });
      }
    } else {
      // صلاحيات محددة
      for (const permKey of role.permissions) {
        const [moduleKey, permissionKey] = permKey.split(':');
        
        if (permissionKey === '*') {
          // جميع صلاحيات الوحدة
          const modulePermissions = await prisma.permission.findMany({
            where: { moduleKey },
          });
          for (const permission of modulePermissions) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: createdRole.id,
                  permissionId: permission.id,
                },
              },
              update: { allowed: true },
              create: {
                roleId: createdRole.id,
                permissionId: permission.id,
                allowed: true,
              },
            });
          }
        } else {
          const permission = await prisma.permission.findFirst({
            where: { moduleKey, permissionKey },
          });
          if (permission) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: createdRole.id,
                  permissionId: permission.id,
                },
              },
              update: { allowed: true },
              create: {
                roleId: createdRole.id,
                permissionId: permission.id,
                allowed: true,
              },
            });
          }
        }
      }
    }
    console.log(`  ✅ ${role.nameAr}`);
  }

  console.log(`\n✨ تم إضافة ${defaultRoles.length} دور بنجاح!\n`);
  console.log('🎉 انتهى إضافة الأدوار والصلاحيات الافتراضية بنجاح!\n');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إضافة البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
