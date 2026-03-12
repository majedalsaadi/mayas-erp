/**
 * Mayas ERP - Database Health Check
 * فحص صحة قاعدة البيانات
 */

import { db } from '@/lib/db';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: boolean;
    migrations: boolean;
    seedData: boolean;
  };
  timestamp: Date;
  version: string;
}

export async function healthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    checks: {
      database: false,
      migrations: false,
      seedData: false,
    },
    timestamp: new Date(),
    version: '0.1.0',
  };

  try {
    // فحص الاتصال بقاعدة البيانات
    await db.$queryRaw`SELECT 1`;
    result.checks.database = true;
  } catch (error) {
    result.status = 'unhealthy';
    return result;
  }

  try {
    // فحص وجود الجداول
    const tables = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ` as any[];
    
    if (tables.length >= 50) {
      result.checks.migrations = true;
    } else {
      result.status = 'degraded';
    }
  } catch (error) {
    result.status = 'degraded';
  }

  try {
    // فحص وجود البيانات الأولية
    const companyCount = await db.company.count();
    const roleCount = await db.role.count();
    
    if (companyCount > 0 && roleCount > 0) {
      result.checks.seedData = true;
    } else {
      result.status = 'degraded';
    }
  } catch (error) {
    result.status = 'degraded';
  }

  return result;
}
