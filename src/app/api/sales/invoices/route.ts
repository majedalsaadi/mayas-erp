/**
 * Mayas ERP - Sales Invoice API
 * API فواتير المبيعات
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api';
import { salesInvoiceSchema } from '@/lib/validations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SalesInvoiceAPI');

// GET - جلب قائمة الفواتير
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;

    const skip = (page - 1) * pageSize;

    const where = {
      ...(status && { status }),
    };

    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesInvoice.count({ where }),
    ]);

    return paginatedResponse(invoices, total, page, pageSize);
  } catch (error) {
    logger.error('خطأ في جلب الفواتير', error as Error);
    return errorResponse('خطأ في جلب الفواتير');
  }
}

// POST - إنشاء فاتورة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = salesInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('بيانات غير صحيحة', 400);
    }

    const data = validation.data;

    // حساب الإجماليات
    let subtotal = 0;
    let taxAmount = 0;

    const lines = data.lines.map((line) => {
      const lineTotal = line.qty * line.unitPrice;
      const lineDiscount = lineTotal * (line.discountPercent / 100);
      const lineNet = lineTotal - lineDiscount;
      const lineTax = lineNet * 0.15; // 15% VAT

      subtotal += lineNet;
      taxAmount += lineTax;

      return {
        itemId: line.itemId,
        qty: line.qty,
        unitId: line.unitId,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
        taxAmount: lineTax,
        lineTotal: lineNet + lineTax,
      };
    });

    const totalAmount = subtotal + taxAmount;

    // إنشاء الفاتورة
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId: '00000000-0000-0000-0000-000000000001',
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        customerId: data.customerId,
        invoiceDate: data.invoiceDate,
        invoiceType: data.invoiceType,
        paymentMethod: data.paymentMethod,
        dueDate: data.dueDate,
        notes: data.notes,
        subtotal,
        taxAmount,
        totalAmount,
        balanceDue: totalAmount,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    logger.info('تم إنشاء فاتورة مبيعات', { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo });

    return successResponse(invoice, 'تم إنشاء الفاتورة بنجاح');
  } catch (error) {
    logger.error('خطأ في إنشاء الفاتورة', error as Error);
    return errorResponse('خطأ في إنشاء الفاتورة');
  }
}
