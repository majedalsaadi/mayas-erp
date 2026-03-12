/**
 * Mayas ERP - POS Terminals API
 * API محطات نقاط البيع
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';

// ============================================
// GET - جلب المحطات
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {
      companyId: company.id,
      branchId: branchId || undefined,
      isActive: activeOnly ? true : undefined,
    };

    const terminals = await prisma.pOSTerminal.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ terminals });
  } catch (error) {
    console.error('خطأ في جلب المحطات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - إنشاء محطة جديدة
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const {
      branchId,
      warehouseId,
      cashboxId,
      code,
      nameAr,
      nameEn,
      receiptPrinter,
      barcodeScanner,
    } = body;

    // التحقق من البيانات
    if (!branchId || !warehouseId || !cashboxId || !code || !nameAr || !nameEn) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // التحقق من عدم تكرار الكود
    const existing = await prisma.pOSTerminal.findFirst({
      where: { branchId, code },
    });

    if (existing) {
      return NextResponse.json({ error: 'كود المحطة موجود مسبقاً' }, { status: 400 });
    }

    // إنشاء المحطة
    const terminal = await prisma.pOSTerminal.create({
      data: {
        companyId: company.id,
        branchId,
        warehouseId,
        cashboxId,
        code,
        nameAr,
        nameEn,
        receiptPrinter,
        barcodeScanner,
        isActive: true,
      },
      include: {
        branch: true,
        warehouse: true,
      },
    });

    return NextResponse.json({ success: true, terminal });
  } catch (error) {
    console.error('خطأ في إنشاء المحطة:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء المحطة' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - تحديث محطة
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المحطة مطلوب' }, { status: 400 });
    }

    // التحقق من المحطة
    const terminal = await prisma.pOSTerminal.findFirst({
      where: { id, companyId: company.id },
    });

    if (!terminal) {
      return NextResponse.json({ error: 'المحطة غير موجودة' }, { status: 404 });
    }

    // تحديث المحطة
    const updated = await prisma.pOSTerminal.update({
      where: { id },
      data: updateData,
      include: {
        branch: true,
        warehouse: true,
      },
    });

    return NextResponse.json({ success: true, terminal: updated });
  } catch (error) {
    console.error('خطأ في تحديث المحطة:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث المحطة' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - حذف محطة (تعطيل)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المحطة مطلوب' }, { status: 400 });
    }

    // التحقق من عدم وجود وردية مفتوحة
    const openShift = await prisma.pOSShift.findFirst({
      where: { terminalId: id, status: 'open' },
    });

    if (openShift) {
      return NextResponse.json(
        { error: 'لا يمكن حذف المحطة لوجود وردية مفتوحة' },
        { status: 400 }
      );
    }

    // تعطيل المحطة
    await prisma.pOSTerminal.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطأ في حذف المحطة:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف المحطة' },
      { status: 500 }
    );
  }
}
