/**
 * Mayas ERP - POS Invoice API
 * API إنشاء فواتير POS
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ============================================
// POST - إنشاء فاتورة POS
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const {
      terminalId,
      customerId,
      items,
      paymentMethod,
      discountPercent = 0,
      discountAmount = 0,
      notes,
    } = body;

    // التحقق من البيانات
    if (!terminalId || !items || items.length === 0) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // جلب المحطة
    const terminal = await prisma.pOSTerminal.findFirst({
      where: { id: terminalId, companyId: company.id, isActive: true },
    });

    if (!terminal) {
      return NextResponse.json({ error: 'المحطة غير موجودة أو غير نشطة' }, { status: 404 });
    }

    // التحقق من وجود وردية مفتوحة
    const openShift = await prisma.pOSShift.findFirst({
      where: { terminalId, status: 'open' },
    });

    if (!openShift) {
      return NextResponse.json({ error: 'لا توجد وردية مفتوحة' }, { status: 400 });
    }

    // تحديد العميل
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      // البحث عن عميل نقدي افتراضي
      let cashCustomer = await prisma.customer.findFirst({
        where: { companyId: company.id, code: 'CASH' },
      });

      if (!cashCustomer) {
        cashCustomer = await prisma.customer.create({
          data: {
            companyId: company.id,
            code: 'CASH',
            nameAr: 'عميل نقدي',
            nameEn: 'Cash Customer',
            customerType: 'retail',
            isActive: true,
          },
        });
      }

      finalCustomerId = cashCustomer.id;
    }

    // توليد رقم الفاتورة
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const lastInvoice = await prisma.salesInvoice.findFirst({
      where: {
        companyId: company.id,
        branchId: terminal.branchId,
        invoiceNo: { startsWith: `INV-${year}${month}-` },
      },
      orderBy: { invoiceNo: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }
    const invoiceNo = `INV-${year}${month}-${String(sequence).padStart(6, '0')}`;

    // حساب مبالغ البنود
    let subtotal = 0;
    let totalTax = 0;
    let totalCost = 0;

    const linesData: Prisma.SalesInvoiceLineCreateManySalesInvoiceInput[] = [];

    for (const item of items) {
      const { itemId, qty, unitPrice, discountPercent: lineDiscount = 0 } = item;

      // جلب معلومات الصنف
      const itemData = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          unit: true,
          taxCode: true,
          stockBalances: {
            where: { warehouseId: terminal.warehouseId },
          },
        },
      });

      if (!itemData) {
        return NextResponse.json(
          { error: `الصنف غير موجود: ${itemId}` },
          { status: 400 }
        );
      }

      // تحديد السعر
      let finalPrice = unitPrice;
      if (!finalPrice) {
        const price = await prisma.itemPrice.findFirst({
          where: { itemId, isActive: true },
        });
        finalPrice = price ? Number(price.price) : 0;
      }

      // حساب الخصم
      const lineDiscountAmount = (finalPrice * qty * lineDiscount) / 100;
      const lineTotal = finalPrice * qty - lineDiscountAmount;

      // حساب الضريبة
      let taxRate = 0;
      let taxCodeId = itemData.taxCodeId;
      if (itemData.taxCode) {
        taxRate = Number(itemData.taxCode.rate);
      }
      const taxAmount = lineTotal * (taxRate / 100);

      // التكلفة
      const cost = itemData.stockBalances[0]
        ? Number(itemData.stockBalances[0].avgCost)
        : 0;

      subtotal += lineTotal;
      totalTax += taxAmount;
      totalCost += cost * qty;

      linesData.push({
        itemId,
        unitId: itemData.unitId,
        qty: new Prisma.Decimal(qty),
        unitFactor: new Prisma.Decimal(1),
        baseQty: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(finalPrice),
        cost: new Prisma.Decimal(cost),
        discountPercent: new Prisma.Decimal(lineDiscount),
        discountAmount: new Prisma.Decimal(lineDiscountAmount),
        taxCodeId,
        taxAmount: new Prisma.Decimal(taxAmount),
        lineTotal: new Prisma.Decimal(lineTotal),
        isManualPrice: !!unitPrice,
      });

      // تحديث المخزون
      const stockBalance = itemData.stockBalances[0];
      if (stockBalance) {
        const newQtyOnHand = Number(stockBalance.qtyOnHand) - qty;
        const newQtyAvailable = newQtyOnHand - Number(stockBalance.qtyReserved);

        await prisma.stockBalance.update({
          where: { id: stockBalance.id },
          data: {
            qtyOnHand: new Prisma.Decimal(newQtyOnHand),
            qtyAvailable: new Prisma.Decimal(newQtyAvailable),
          },
        });
      }
    }

    // تطبيق خصم إضافي على مستوى الفاتورة
    const additionalDiscount = discountAmount || (subtotal * discountPercent / 100);
    const totalAmount = subtotal + totalTax - additionalDiscount;

    // تحديد حالة الدفع
    const paymentStatus = 'paid'; // في POS يتم الدفع فوراً
    const status = 'confirmed';

    // إنشاء الفاتورة مع البنود والدفعات
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId: company.id,
        branchId: terminal.branchId,
        warehouseId: terminal.warehouseId,
        posTerminalId: terminalId,
        invoiceNo,
        invoiceDate: new Date(),
        invoiceType: paymentMethod === 'cash' ? 'cash' : 'credit',
        invoiceSubtype: 'simplified',
        customerId: finalCustomerId,
        cashierUserId: user.id,
        currencyCode: 'SAR',
        exchangeRate: new Prisma.Decimal(1),
        paymentStatus,
        paymentMethod,
        subtotal: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(additionalDiscount),
        discountPercent: new Prisma.Decimal(discountPercent),
        taxAmount: new Prisma.Decimal(totalTax),
        roundAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        paidAmount: new Prisma.Decimal(totalAmount),
        balanceDue: new Prisma.Decimal(0),
        costTotal: new Prisma.Decimal(totalCost),
        grossProfit: new Prisma.Decimal(subtotal - totalCost),
        status,
        notes,
        createdById: user.id,
        lines: {
          createMany: { data: linesData },
        },
        payments: {
          create: {
            companyId: company.id,
            branchId: terminal.branchId,
            paymentDate: new Date(),
            paymentMethod,
            amount: new Prisma.Decimal(totalAmount),
            cashboxId: terminal.cashboxId,
            createdById: user.id,
          },
        },
      },
      include: {
        lines: {
          include: {
            item: true,
            unit: true,
          },
        },
        payments: true,
        customer: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    // إضافة حركة للوردية
    await prisma.pOSShiftMovement.create({
      data: {
        shiftId: openShift.id,
        movementType: 'sale',
        amount: new Prisma.Decimal(totalAmount),
        referenceType: 'sales_invoice',
        referenceId: invoice.id,
      },
    });

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        discountPercent: Number(invoice.discountPercent),
        taxAmount: Number(invoice.taxAmount),
        roundAmount: Number(invoice.roundAmount),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        balanceDue: Number(invoice.balanceDue),
        costTotal: Number(invoice.costTotal),
        grossProfit: Number(invoice.grossProfit),
        lines: invoice.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitFactor: Number(line.unitFactor),
          baseQty: Number(line.baseQty),
          unitPrice: Number(line.unitPrice),
          cost: Number(line.cost),
          discountPercent: Number(line.discountPercent),
          discountAmount: Number(line.discountAmount),
          taxAmount: Number(line.taxAmount),
          lineTotal: Number(line.lineTotal),
        })),
        payments: invoice.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    });
  } catch (error) {
    console.error('خطأ في إنشاء الفاتورة:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء الفاتورة' },
      { status: 500 }
    );
  }
}

// ============================================
// GET - جلب آخر فواتير المحطة
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!terminalId) {
      return NextResponse.json({ error: 'معرف المحطة مطلوب' }, { status: 400 });
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        companyId: company.id,
        posTerminalId: terminalId,
      },
      include: {
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                nameAr: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            code: true,
            nameAr: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        ...inv,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        taxAmount: Number(inv.taxAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        balanceDue: Number(inv.balanceDue),
        lines: inv.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
        })),
      })),
    });
  } catch (error) {
    console.error('خطأ في جلب الفواتير:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}
