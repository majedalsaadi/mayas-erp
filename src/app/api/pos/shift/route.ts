/**
 * Mayas ERP - POS Shift API
 * API ورديات نقاط البيع
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ============================================
// GET - جلب معلومات الوردية
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    const shiftId = searchParams.get('shiftId');
    const action = searchParams.get('action');

    // جلب الوردية الحالية للمحطة
    if (terminalId && action === 'current') {
      const shift = await prisma.pOSShift.findFirst({
        where: {
          terminalId,
          status: 'open',
          terminal: { companyId: company.id },
        },
        include: {
          terminal: true,
          movements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!shift) {
        return NextResponse.json({ shift: null });
      }

      return NextResponse.json({
        shift: {
          ...shift,
          openingCash: Number(shift.openingCash),
          expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
          actualCash: shift.actualCash ? Number(shift.actualCash) : null,
          cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
          movements: shift.movements.map((m) => ({
            ...m,
            amount: Number(m.amount),
          })),
        },
      });
    }

    // جلب وردية محددة
    if (shiftId) {
      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          terminal: { companyId: company.id },
        },
        include: {
          terminal: true,
          movements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 });
      }

      return NextResponse.json({
        shift: {
          ...shift,
          openingCash: Number(shift.openingCash),
          expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
          actualCash: shift.actualCash ? Number(shift.actualCash) : null,
          cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
          movements: shift.movements.map((m) => ({
            ...m,
            amount: Number(m.amount),
          })),
        },
      });
    }

    // جلب قائمة الورديات
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.POSShiftWhereInput = {
      terminal: { companyId: company.id },
      terminalId,
      status,
    };

    if (dateFrom || dateTo) {
      where.openedAt = {};
      if (dateFrom) where.openedAt.gte = new Date(dateFrom);
      if (dateTo) where.openedAt.lte = new Date(dateTo);
    }

    const total = await prisma.pOSShift.count({ where });

    const shifts = await prisma.pOSShift.findMany({
      where,
      include: {
        terminal: true,
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      shifts: shifts.map((shift) => ({
        ...shift,
        openingCash: Number(shift.openingCash),
        expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
        actualCash: shift.actualCash ? Number(shift.actualCash) : null,
        cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
        movements: shift.movements.map((m) => ({
          ...m,
          amount: Number(m.amount),
        })),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('خطأ في جلب الورديات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - إدارة الورديات (فتح/إغلاق/حركات)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // ========================================
    // فتح وردية جديدة
    // ========================================
    if (action === 'open') {
      const { terminalId, openingCash, notes } = body;

      if (!terminalId) {
        return NextResponse.json({ error: 'معرف المحطة مطلوب' }, { status: 400 });
      }

      // التحقق من المحطة
      const terminal = await prisma.pOSTerminal.findFirst({
        where: { id: terminalId, companyId: company.id, isActive: true },
      });

      if (!terminal) {
        return NextResponse.json({ error: 'المحطة غير موجودة أو غير نشطة' }, { status: 404 });
      }

      // التحقق من عدم وجود وردية مفتوحة
      const openShift = await prisma.pOSShift.findFirst({
        where: { terminalId, status: 'open' },
      });

      if (openShift) {
        return NextResponse.json(
          { error: 'يوجد وردية مفتوحة مسبقاً لهذه المحطة' },
          { status: 400 }
        );
      }

      // توليد رقم الوردية
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const lastShift = await prisma.pOSShift.findFirst({
        where: {
          terminalId,
          shiftNo: { startsWith: `SH-${year}${month}-` },
        },
        orderBy: { shiftNo: 'desc' },
      });

      let sequence = 1;
      if (lastShift) {
        const parts = lastShift.shiftNo.split('-');
        if (parts.length === 3) {
          sequence = parseInt(parts[2], 10) + 1;
        }
      }
      const shiftNo = `SH-${year}${month}-${String(sequence).padStart(4, '0')}`;

      // إنشاء الوردية مع حركة الفتح
      const shift = await prisma.pOSShift.create({
        data: {
          terminalId,
          userId: user.id,
          shiftNo,
          openedAt: new Date(),
          openingCash: new Prisma.Decimal(openingCash || 0),
          status: 'open',
          notes,
          movements: {
            create: {
              movementType: 'open',
              amount: new Prisma.Decimal(openingCash || 0),
              notes: 'رصيد افتتاحي',
            },
          },
        },
        include: {
          terminal: true,
          movements: true,
        },
      });

      return NextResponse.json({
        success: true,
        shift: {
          ...shift,
          openingCash: Number(shift.openingCash),
          movements: shift.movements.map((m) => ({
            ...m,
            amount: Number(m.amount),
          })),
        },
      });
    }

    // ========================================
    // إغلاق وردية
    // ========================================
    if (action === 'close') {
      const { shiftId, actualCash, notes } = body;

      if (!shiftId) {
        return NextResponse.json({ error: 'معرف الوردية مطلوب' }, { status: 400 });
      }

      // جلب الوردية
      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          status: 'open',
          terminal: { companyId: company.id },
        },
        include: { terminal: true, movements: true },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة أو مغلقة' }, { status: 404 });
      }

      // حساب المتوقع في الصندوق
      let expectedCash = 0;
      for (const movement of shift.movements) {
        const amount = Number(movement.amount);
        switch (movement.movementType) {
          case 'open':
          case 'sale':
          case 'cash_in':
            expectedCash += amount;
            break;
          case 'refund':
          case 'cash_out':
            expectedCash -= amount;
            break;
        }
      }

      const difference = actualCash - expectedCash;

      // إضافة حركة الإغلاق وتحديث الوردية
      const updatedShift = await prisma.pOSShift.update({
        where: { id: shiftId },
        data: {
          closedAt: new Date(),
          expectedCash: new Prisma.Decimal(expectedCash),
          actualCash: new Prisma.Decimal(actualCash),
          cashDifference: new Prisma.Decimal(difference),
          status: 'closed',
          notes: notes ? `${shift.notes || ''}\n${notes}` : shift.notes,
          movements: {
            create: {
              movementType: 'close',
              amount: new Prisma.Decimal(actualCash),
              notes: `إغلاق الوردية - الفرق: ${difference.toFixed(2)}`,
            },
          },
        },
        include: {
          terminal: true,
          movements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return NextResponse.json({
        success: true,
        shift: {
          ...updatedShift,
          openingCash: Number(updatedShift.openingCash),
          expectedCash: Number(updatedShift.expectedCash),
          actualCash: Number(updatedShift.actualCash),
          cashDifference: Number(updatedShift.cashDifference),
          movements: updatedShift.movements.map((m) => ({
            ...m,
            amount: Number(m.amount),
          })),
        },
        summary: {
          expectedCash,
          actualCash,
          difference,
        },
      });
    }

    // ========================================
    // إضافة حركة صندوق (إيداع/سحب)
    // ========================================
    if (action === 'movement') {
      const { shiftId, movementType, amount, notes } = body;

      if (!shiftId || !movementType || amount === undefined) {
        return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
      }

      if (!['cash_in', 'cash_out'].includes(movementType)) {
        return NextResponse.json({ error: 'نوع الحركة غير صحيح' }, { status: 400 });
      }

      // التحقق من الوردية
      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          status: 'open',
          terminal: { companyId: company.id },
        },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة أو مغلقة' }, { status: 404 });
      }

      // إنشاء الحركة
      const movement = await prisma.pOSShiftMovement.create({
        data: {
          shiftId,
          movementType,
          amount: new Prisma.Decimal(amount),
          notes,
        },
      });

      return NextResponse.json({
        success: true,
        movement: {
          ...movement,
          amount: Number(movement.amount),
        },
      });
    }

    // ========================================
    // تعليق وردية
    // ========================================
    if (action === 'suspend') {
      const { shiftId, notes } = body;

      if (!shiftId) {
        return NextResponse.json({ error: 'معرف الوردية مطلوب' }, { status: 400 });
      }

      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          status: 'open',
          terminal: { companyId: company.id },
        },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة أو مغلقة' }, { status: 404 });
      }

      const updatedShift = await prisma.pOSShift.update({
        where: { id: shiftId },
        data: {
          status: 'suspended',
          notes: notes ? `${shift.notes || ''}\n${notes}` : shift.notes,
        },
        include: { terminal: true },
      });

      return NextResponse.json({
        success: true,
        shift: {
          ...updatedShift,
          openingCash: Number(updatedShift.openingCash),
        },
      });
    }

    // ========================================
    // استئناف وردية معلقة
    // ========================================
    if (action === 'resume') {
      const { shiftId } = body;

      if (!shiftId) {
        return NextResponse.json({ error: 'معرف الوردية مطلوب' }, { status: 400 });
      }

      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          status: 'suspended',
          terminal: { companyId: company.id },
        },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة أو غير معلقة' }, { status: 404 });
      }

      const updatedShift = await prisma.pOSShift.update({
        where: { id: shiftId },
        data: { status: 'open' },
        include: { terminal: true },
      });

      return NextResponse.json({
        success: true,
        shift: {
          ...updatedShift,
          openingCash: Number(updatedShift.openingCash),
        },
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('خطأ في معالجة الوردية:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}

// ============================================
// GET Summary - ملخص الوردية
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftId, action } = body;

    if (action === 'summary' && shiftId) {
      // جلب الوردية مع الفواتير
      const shift = await prisma.pOSShift.findFirst({
        where: {
          id: shiftId,
          terminal: { companyId: company.id },
        },
        include: {
          terminal: true,
          movements: true,
        },
      });

      if (!shift) {
        return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 });
      }

      // جلب الفواتير في فترة الوردية
      const invoices = await prisma.salesInvoice.findMany({
        where: {
          posTerminalId: shift.terminalId,
          createdAt: {
            gte: shift.openedAt,
            lte: shift.closedAt || new Date(),
          },
        },
        include: {
          payments: true,
        },
      });

      // حساب الإحصائيات
      let totalSales = 0;
      let totalRefunds = 0;
      let totalCashIn = 0;
      let totalCashOut = 0;
      const paymentsByMethod: Record<string, number> = {};

      for (const movement of shift.movements) {
        const amount = Number(movement.amount);
        switch (movement.movementType) {
          case 'sale':
            totalSales += amount;
            break;
          case 'refund':
            totalRefunds += Math.abs(amount);
            break;
          case 'cash_in':
            totalCashIn += amount;
            break;
          case 'cash_out':
            totalCashOut += amount;
            break;
        }
      }

      for (const invoice of invoices) {
        for (const payment of invoice.payments) {
          const method = payment.paymentMethod;
          const amount = Number(payment.amount);
          paymentsByMethod[method] = (paymentsByMethod[method] || 0) + amount;
        }
      }

      return NextResponse.json({
        summary: {
          shiftId: shift.id,
          shiftNo: shift.shiftNo,
          terminalName: shift.terminal?.nameAr || '',
          openedAt: shift.openedAt,
          closedAt: shift.closedAt,
          openingCash: Number(shift.openingCash),
          expectedCash: Number(shift.expectedCash),
          actualCash: Number(shift.actualCash),
          cashDifference: Number(shift.cashDifference),
          totalSales,
          totalRefunds,
          totalCashIn,
          totalCashOut,
          transactionCount: invoices.length,
          paymentsByMethod,
        },
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('خطأ في جلب ملخص الوردية:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}
