/**
 * Mayas ERP - Sales Orders API
 * API أوامر المبيعات
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ============================================
// GET - جلب أوامر المبيعات
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const customerId = searchParams.get('customerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.SalesOrderWhereInput = {
      companyId: company.id,
      customerId,
      status,
      branchId,
    };

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) where.orderDate.gte = new Date(dateFrom);
      if (dateTo) where.orderDate.lte = new Date(dateTo);
    }

    const total = await prisma.salesOrder.count({ where });

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            nameAr: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            nameAr: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                nameAr: true,
                nameEn: true,
              },
            },
            unit: true,
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // تحويل البيانات
    const transformedOrders = orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      lines: order.lines.map((line) => ({
        ...line,
        qtyOrdered: Number(line.qtyOrdered),
        qtyShipped: Number(line.qtyShipped),
        qtyInvoiced: Number(line.qtyInvoiced),
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent),
        discountAmount: Number(line.discountAmount),
        taxAmount: Number(line.taxAmount),
        lineTotal: Number(line.lineTotal),
      })),
    }));

    return NextResponse.json({
      orders: transformedOrders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('خطأ في جلب أوامر المبيعات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - إنشاء أمر مبيعات جديد
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
      customerId,
      quoteId,
      currencyCode = 'SAR',
      priceTierId,
      expectedShipDate,
      discountAmount = 0,
      notes,
      lines,
    } = body;

    // التحقق من البيانات
    if (!branchId || !warehouseId || !customerId || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: 'البيانات غير مكتملة' },
        { status: 400 }
      );
    }

    // توليد رقم أمر المبيعات
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const lastOrder = await prisma.salesOrder.findFirst({
      where: {
        companyId: company.id,
        branchId,
        orderNo: { startsWith: `SO-${year}${month}-` },
      },
      orderBy: { orderNo: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }
    const orderNo = `SO-${year}${month}-${String(sequence).padStart(6, '0')}`;

    // حساب المبالغ
    let subtotal = 0;
    let totalTax = 0;

    const linesData = await Promise.all(
      lines.map(async (line: any) => {
        const { itemId, qtyOrdered, unitId, unitPrice, discountPercent = 0, taxCodeId } = line;

        // جلب سعر الصنف إذا لم يتم تحديده
        let finalPrice = unitPrice;
        if (!unitPrice) {
          const price = await prisma.itemPrice.findFirst({
            where: {
              itemId,
              priceTierId,
              isActive: true,
            },
          });
          finalPrice = price ? Number(price.price) : 0;
        }

        // حساب الخصم
        const discountAmount = (finalPrice * qtyOrdered * discountPercent) / 100;
        const lineTotal = finalPrice * qtyOrdered - discountAmount;

        // حساب الضريبة
        let taxRate = 0;
        let finalTaxCodeId = taxCodeId;
        if (taxCodeId) {
          const tax = await prisma.taxCode.findUnique({ where: { id: taxCodeId } });
          if (tax) taxRate = Number(tax.rate);
        } else {
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { taxCode: true },
          });
          if (item?.taxCode) {
            taxRate = Number(item.taxCode.rate);
            finalTaxCodeId = item.taxCodeId;
          }
        }

        const taxAmount = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        totalTax += taxAmount;

        return {
          itemId,
          unitId,
          qtyOrdered: new Prisma.Decimal(qtyOrdered),
          qtyShipped: new Prisma.Decimal(0),
          qtyInvoiced: new Prisma.Decimal(0),
          unitPrice: new Prisma.Decimal(finalPrice),
          discountPercent: new Prisma.Decimal(discountPercent),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxCodeId: finalTaxCodeId,
          taxAmount: new Prisma.Decimal(taxAmount),
          lineTotal: new Prisma.Decimal(lineTotal),
        };
      })
    );

    const totalAmount = subtotal + totalTax - discountAmount;

    // إنشاء أمر المبيعات
    const order = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        branchId,
        warehouseId,
        orderNo,
        orderDate: new Date(),
        customerId,
        quoteId,
        currencyCode,
        priceTierId,
        subtotal: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxAmount: new Prisma.Decimal(totalTax),
        totalAmount: new Prisma.Decimal(totalAmount),
        expectedShipDate: expectedShipDate ? new Date(expectedShipDate) : undefined,
        status: 'draft',
        notes,
        createdById: user.id,
        lines: {
          createMany: { data: linesData },
        },
      },
      include: {
        customer: true,
        branch: true,
        warehouse: true,
        lines: {
          include: {
            item: true,
            unit: true,
          },
        },
      },
    });

    // تحديث حالة عرض السعر إذا كان مرتبطاً
    if (quoteId) {
      await prisma.salesQuote.update({
        where: { id: quoteId },
        data: { status: 'converted' },
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        lines: order.lines.map((line) => ({
          ...line,
          qtyOrdered: Number(line.qtyOrdered),
          qtyShipped: Number(line.qtyShipped),
          qtyInvoiced: Number(line.qtyInvoiced),
          unitPrice: Number(line.unitPrice),
          discountPercent: Number(line.discountPercent),
          discountAmount: Number(line.discountAmount),
          taxAmount: Number(line.taxAmount),
          lineTotal: Number(line.lineTotal),
        })),
      },
    });
  } catch (error) {
    console.error('خطأ في إنشاء أمر المبيعات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء أمر المبيعات' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - تحديث أمر مبيعات
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { id, lines, discountAmount, notes, expectedShipDate, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف أمر المبيعات مطلوب' }, { status: 400 });
    }

    // جلب أمر المبيعات الحالي
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { id, companyId: company.id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'أمر المبيعات غير موجود' }, { status: 404 });
    }

    if (existingOrder.status === 'cancelled' || existingOrder.status === 'invoiced') {
      return NextResponse.json(
        { error: 'لا يمكن تعديل أمر المبيعات في هذه الحالة' },
        { status: 400 }
      );
    }

    // تحديث الحالة فقط إذا تم تحديدها
    if (status && !lines) {
      const updatedOrder = await prisma.salesOrder.update({
        where: { id },
        data: { status },
        include: {
          customer: true,
          lines: { include: { item: true, unit: true } },
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          ...updatedOrder,
          subtotal: Number(updatedOrder.subtotal),
          discountAmount: Number(updatedOrder.discountAmount),
          taxAmount: Number(updatedOrder.taxAmount),
          totalAmount: Number(updatedOrder.totalAmount),
          lines: updatedOrder.lines.map((line) => ({
            ...line,
            qtyOrdered: Number(line.qtyOrdered),
            qtyShipped: Number(line.qtyShipped),
            qtyInvoiced: Number(line.qtyInvoiced),
            unitPrice: Number(line.unitPrice),
            discountPercent: Number(line.discountPercent),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            lineTotal: Number(line.lineTotal),
          })),
        },
      });
    }

    // تحديث شامل مع البنود
    if (lines && lines.length > 0) {
      // حذف البنود القديمة
      await prisma.salesOrderLine.deleteMany({
        where: { salesOrderId: id },
      });

      // حساب المبالغ الجديدة
      let subtotal = 0;
      let totalTax = 0;

      const linesData = await Promise.all(
        lines.map(async (line: any) => {
          const { itemId, qtyOrdered, unitId, unitPrice, discountPercent = 0, taxCodeId } = line;

          const discountAmount = (unitPrice * qtyOrdered * discountPercent) / 100;
          const lineTotal = unitPrice * qtyOrdered - discountAmount;

          let taxRate = 0;
          let finalTaxCodeId = taxCodeId;
          if (taxCodeId) {
            const tax = await prisma.taxCode.findUnique({ where: { id: taxCodeId } });
            if (tax) taxRate = Number(tax.rate);
          } else {
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              include: { taxCode: true },
            });
            if (item?.taxCode) {
              taxRate = Number(item.taxCode.rate);
              finalTaxCodeId = item.taxCodeId;
            }
          }

          const taxAmount = lineTotal * (taxRate / 100);

          subtotal += lineTotal;
          totalTax += taxAmount;

          return {
            salesOrderId: id,
            itemId,
            unitId,
            qtyOrdered: new Prisma.Decimal(qtyOrdered),
            qtyShipped: new Prisma.Decimal(0),
            qtyInvoiced: new Prisma.Decimal(0),
            unitPrice: new Prisma.Decimal(unitPrice),
            discountPercent: new Prisma.Decimal(discountPercent),
            discountAmount: new Prisma.Decimal(discountAmount),
            taxCodeId: finalTaxCodeId,
            taxAmount: new Prisma.Decimal(taxAmount),
            lineTotal: new Prisma.Decimal(lineTotal),
          };
        })
      );

      const finalDiscount = discountAmount !== undefined ? discountAmount : Number(existingOrder.discountAmount);
      const totalAmount = subtotal + totalTax - finalDiscount;

      // إنشاء البنود الجديدة
      await prisma.salesOrderLine.createMany({ data: linesData });

      // تحديث أمر المبيعات
      const updatedOrder = await prisma.salesOrder.update({
        where: { id },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(finalDiscount),
          taxAmount: new Prisma.Decimal(totalTax),
          totalAmount: new Prisma.Decimal(totalAmount),
          expectedShipDate: expectedShipDate ? new Date(expectedShipDate) : existingOrder.expectedShipDate,
          notes: notes || existingOrder.notes,
        },
        include: {
          customer: true,
          branch: true,
          warehouse: true,
          lines: {
            include: {
              item: true,
              unit: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          ...updatedOrder,
          subtotal: Number(updatedOrder.subtotal),
          discountAmount: Number(updatedOrder.discountAmount),
          taxAmount: Number(updatedOrder.taxAmount),
          totalAmount: Number(updatedOrder.totalAmount),
          lines: updatedOrder.lines.map((line) => ({
            ...line,
            qtyOrdered: Number(line.qtyOrdered),
            qtyShipped: Number(line.qtyShipped),
            qtyInvoiced: Number(line.qtyInvoiced),
            unitPrice: Number(line.unitPrice),
            discountPercent: Number(line.discountPercent),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            lineTotal: Number(line.lineTotal),
          })),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطأ في تحديث أمر المبيعات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث أمر المبيعات' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - حذف أمر مبيعات
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
      return NextResponse.json({ error: 'معرف أمر المبيعات مطلوب' }, { status: 400 });
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id, companyId: company.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'أمر المبيعات غير موجود' }, { status: 404 });
    }

    if (order.status !== 'draft') {
      return NextResponse.json(
        { error: 'لا يمكن حذف أمر المبيعات إلا في حالة المسودة' },
        { status: 400 }
      );
    }

    // حذف البنود ثم أمر المبيعات
    await prisma.$transaction([
      prisma.salesOrderLine.deleteMany({ where: { salesOrderId: id } }),
      prisma.salesOrder.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطأ في حذف أمر المبيعات:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف أمر المبيعات' },
      { status: 500 }
    );
  }
}
