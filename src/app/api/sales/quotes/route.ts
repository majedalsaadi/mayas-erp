/**
 * Mayas ERP - Sales Quotes API
 * API عروض أسعار المبيعات
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ============================================
// GET - جلب عروض الأسعار
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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.SalesQuoteWhereInput = {
      companyId: company.id,
      customerId,
      status,
    };

    if (dateFrom || dateTo) {
      where.quoteDate = {};
      if (dateFrom) where.quoteDate.gte = new Date(dateFrom);
      if (dateTo) where.quoteDate.lte = new Date(dateTo);
    }

    const total = await prisma.salesQuote.count({ where });

    const quotes = await prisma.salesQuote.findMany({
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
        quoteDate: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // تحويل البيانات
    const transformedQuotes = quotes.map((quote) => ({
      ...quote,
      subtotal: Number(quote.subtotal),
      discountAmount: Number(quote.discountAmount),
      taxAmount: Number(quote.taxAmount),
      totalAmount: Number(quote.totalAmount),
      lines: quote.lines.map((line) => ({
        ...line,
        qty: Number(line.qty),
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent),
        discountAmount: Number(line.discountAmount),
        taxAmount: Number(line.taxAmount),
        lineTotal: Number(line.lineTotal),
      })),
    }));

    return NextResponse.json({
      quotes: transformedQuotes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('خطأ في جلب عروض الأسعار:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب البيانات' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - إنشاء عرض سعر جديد
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
      customerId,
      currencyCode = 'SAR',
      priceTierId,
      validUntil,
      discountAmount = 0,
      notes,
      lines,
    } = body;

    // التحقق من البيانات
    if (!branchId || !customerId || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: 'البيانات غير مكتملة' },
        { status: 400 }
      );
    }

    // توليد رقم عرض السعر
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const lastQuote = await prisma.salesQuote.findFirst({
      where: {
        companyId: company.id,
        branchId,
        quoteNo: { startsWith: `QT-${year}${month}-` },
      },
      orderBy: { quoteNo: 'desc' },
    });

    let sequence = 1;
    if (lastQuote) {
      const parts = lastQuote.quoteNo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }
    const quoteNo = `QT-${year}${month}-${String(sequence).padStart(6, '0')}`;

    // حساب المبالغ
    let subtotal = 0;
    let totalTax = 0;

    const linesData = await Promise.all(
      lines.map(async (line: any) => {
        const { itemId, qty, unitId, unitPrice, discountPercent = 0, taxCodeId } = line;

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
        const discountAmount = (finalPrice * qty * discountPercent) / 100;
        const lineTotal = finalPrice * qty - discountAmount;

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
          qty: new Prisma.Decimal(qty),
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

    // إنشاء عرض السعر
    const quote = await prisma.salesQuote.create({
      data: {
        companyId: company.id,
        branchId,
        quoteNo,
        quoteDate: new Date(),
        customerId,
        currencyCode,
        priceTierId,
        subtotal: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxAmount: new Prisma.Decimal(totalTax),
        totalAmount: new Prisma.Decimal(totalAmount),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        status: 'draft',
        notes,
        createdById: user.id,
        lines: {
          createMany: { data: linesData },
        },
      },
      include: {
        customer: true,
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
      quote: {
        ...quote,
        subtotal: Number(quote.subtotal),
        discountAmount: Number(quote.discountAmount),
        taxAmount: Number(quote.taxAmount),
        totalAmount: Number(quote.totalAmount),
        lines: quote.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPercent: Number(line.discountPercent),
          discountAmount: Number(line.discountAmount),
          taxAmount: Number(line.taxAmount),
          lineTotal: Number(line.lineTotal),
        })),
      },
    });
  } catch (error) {
    console.error('خطأ في إنشاء عرض السعر:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء عرض السعر' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - تحديث عرض سعر
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { id, lines, discountAmount, notes, validUntil, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف عرض السعر مطلوب' }, { status: 400 });
    }

    // جلب عرض السعر الحالي
    const existingQuote = await prisma.salesQuote.findFirst({
      where: { id, companyId: company.id },
    });

    if (!existingQuote) {
      return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
    }

    if (existingQuote.status === 'converted' || existingQuote.status === 'rejected') {
      return NextResponse.json(
        { error: 'لا يمكن تعديل عرض السعر في هذه الحالة' },
        { status: 400 }
      );
    }

    // إذا تم تحديث البنود
    if (lines && lines.length > 0) {
      // حذف البنود القديمة
      await prisma.salesQuoteLine.deleteMany({
        where: { salesQuoteId: id },
      });

      // حساب المبالغ الجديدة
      let subtotal = 0;
      let totalTax = 0;

      const linesData = await Promise.all(
        lines.map(async (line: any) => {
          const { itemId, qty, unitId, unitPrice, discountPercent = 0, taxCodeId } = line;

          const discountAmount = (unitPrice * qty * discountPercent) / 100;
          const lineTotal = unitPrice * qty - discountAmount;

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
            salesQuoteId: id,
            itemId,
            unitId,
            qty: new Prisma.Decimal(qty),
            unitPrice: new Prisma.Decimal(unitPrice),
            discountPercent: new Prisma.Decimal(discountPercent),
            discountAmount: new Prisma.Decimal(discountAmount),
            taxCodeId: finalTaxCodeId,
            taxAmount: new Prisma.Decimal(taxAmount),
            lineTotal: new Prisma.Decimal(lineTotal),
          };
        })
      );

      const finalDiscount = discountAmount !== undefined ? discountAmount : Number(existingQuote.discountAmount);
      const totalAmount = subtotal + totalTax - finalDiscount;

      // إنشاء البنود الجديدة
      await prisma.salesQuoteLine.createMany({ data: linesData });

      // تحديث عرض السعر
      const updatedQuote = await prisma.salesQuote.update({
        where: { id },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(finalDiscount),
          taxAmount: new Prisma.Decimal(totalTax),
          totalAmount: new Prisma.Decimal(totalAmount),
          validUntil: validUntil ? new Date(validUntil) : existingQuote.validUntil,
          notes: notes || existingQuote.notes,
          status: status || existingQuote.status,
        },
        include: {
          customer: true,
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
        quote: {
          ...updatedQuote,
          subtotal: Number(updatedQuote.subtotal),
          discountAmount: Number(updatedQuote.discountAmount),
          taxAmount: Number(updatedQuote.taxAmount),
          totalAmount: Number(updatedQuote.totalAmount),
          lines: updatedQuote.lines.map((line) => ({
            ...line,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            discountPercent: Number(line.discountPercent),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            lineTotal: Number(line.lineTotal),
          })),
        },
      });
    }

    // تحديث بسيط بدون بنود
    const updatedQuote = await prisma.salesQuote.update({
      where: { id },
      data: {
        discountAmount: discountAmount !== undefined ? new Prisma.Decimal(discountAmount) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes: notes || undefined,
        status: status || undefined,
      },
      include: {
        customer: true,
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
      quote: {
        ...updatedQuote,
        subtotal: Number(updatedQuote.subtotal),
        discountAmount: Number(updatedQuote.discountAmount),
        taxAmount: Number(updatedQuote.taxAmount),
        totalAmount: Number(updatedQuote.totalAmount),
        lines: updatedQuote.lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPercent: Number(line.discountPercent),
          discountAmount: Number(line.discountAmount),
          taxAmount: Number(line.taxAmount),
          lineTotal: Number(line.lineTotal),
        })),
      },
    });
  } catch (error) {
    console.error('خطأ في تحديث عرض السعر:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث عرض السعر' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - حذف عرض سعر
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
      return NextResponse.json({ error: 'معرف عرض السعر مطلوب' }, { status: 400 });
    }

    const quote = await prisma.salesQuote.findFirst({
      where: { id, companyId: company.id },
    });

    if (!quote) {
      return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
    }

    if (quote.status === 'converted') {
      return NextResponse.json(
        { error: 'لا يمكن حذف عرض السعر المحول' },
        { status: 400 }
      );
    }

    // حذف البنود ثم عرض السعر
    await prisma.$transaction([
      prisma.salesQuoteLine.deleteMany({ where: { salesQuoteId: id } }),
      prisma.salesQuote.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطأ في حذف عرض السعر:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف عرض السعر' },
      { status: 500 }
    );
  }
}
