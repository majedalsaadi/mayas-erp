/**
 * Mayas ERP - POS Items Search API
 * API البحث عن الأصناف للـ POS
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuth } from '@/lib/auth';

// ============================================
// GET - البحث عن أصناف
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, company } = await getAuth(request);
    if (!user || !company) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const warehouseId = searchParams.get('warehouseId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    // البحث أولاً في الباركودات
    const barcodeMatch = await prisma.itemBarcode.findFirst({
      where: {
        barcode: q,
        item: { companyId: company.id, isActive: true },
      },
      include: {
        item: {
          include: {
            unit: true,
            prices: {
              where: { isActive: true },
              take: 1,
            },
            stockBalances: warehouseId
              ? { where: { warehouseId } }
              : undefined,
          },
        },
      },
    });

    if (barcodeMatch) {
      const item = barcodeMatch.item;
      return NextResponse.json({
        items: [
          {
            id: item.id,
            code: item.code,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            barcode: barcodeMatch.barcode,
            price: item.prices[0] ? Number(item.prices[0].price) : 0,
            stock: item.stockBalances?.[0]
              ? Number(item.stockBalances[0].qtyAvailable)
              : 0,
            unitId: item.unitId,
            unitName: item.unit?.nameAr || '',
          },
        ],
      });
    }

    // البحث في الأصناف
    const items = await prisma.item.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { nameAr: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
          { partNumber: { contains: q, mode: 'insensitive' } },
          { oemNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        unit: true,
        barcodes: {
          where: { isPrimary: true },
          take: 1,
        },
        prices: {
          where: { isActive: true },
          take: 1,
        },
        stockBalances: warehouseId
          ? { where: { warehouseId } }
          : undefined,
      },
      take: limit,
      orderBy: { code: 'asc' },
    });

    const results = items.map((item) => ({
      id: item.id,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      barcode: item.barcodes[0]?.barcode,
      price: item.prices[0] ? Number(item.prices[0].price) : 0,
      stock: item.stockBalances?.[0]
        ? Number(item.stockBalances[0].qtyAvailable)
        : 0,
      unitId: item.unitId,
      unitName: item.unit?.nameAr || '',
    }));

    return NextResponse.json({ items: results });
  } catch (error) {
    console.error('خطأ في البحث عن الأصناف:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في البحث' },
      { status: 500 }
    );
  }
}
