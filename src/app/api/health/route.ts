/**
 * Mayas ERP - Health Check API
 * فحص صحة النظام
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV,
    services: {
      database: 'unknown',
      redis: 'unknown',
      storage: 'unknown',
    },
  };

  try {
    // فحص قاعدة البيانات
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // فحص Redis (إذا كان متاحاً)
  // TODO: إضافة فحص Redis

  // فحص التخزين (إذا كان متاحاً)
  // TODO: إضافة فحص Supabase Storage

  const statusCode = health.status === 'ok' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
