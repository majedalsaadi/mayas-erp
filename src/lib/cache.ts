/**
 * Mayas ERP - Cache Utilities
 * أدوات التخزين المؤقت
 */

import { Redis } from '@upstash/redis';
import { env } from './env';

// إنشاء عميل Redis
const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * تخزين مؤقت
 */
export const cache = {
  /**
   * جلب من التخزين المؤقت
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    
    try {
      const value = await redis.get<T>(key);
      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * حفظ في التخزين المؤقت
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!redis) return false;
    
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * حذف من التخزين المؤقت
   */
  async del(key: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache del error:', error);
      return false;
    }
  },

  /**
   * حذف مجموعة مفاتيح
   */
  async delPattern(pattern: string): Promise<number> {
    if (!redis) return 0;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return 0;
    }
  },

  /**
   * جلب أو إنشاء
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  },
};

/**
 * مفاتيح التخزين المؤقت
 */
export const cacheKeys = {
  // المستخدم
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `user:${id}:permissions`,
  userBranches: (id: string) => `user:${id}:branches`,
  
  // الشركة
  company: (id: string) => `company:${id}`,
  companySettings: (id: string) => `company:${id}:settings`,
  
  // الفرع
  branch: (id: string) => `branch:${id}`,
  
  // المستودع
  warehouse: (id: string) => `warehouse:${id}`,
  
  // المخزون
  stockBalance: (warehouseId: string, itemId: string) =>
    `stock:${warehouseId}:${itemId}`,
  stockBalances: (warehouseId: string) => `stock:${warehouseId}:all`,
  
  // الصنف
  item: (id: string) => `item:${id}`,
  items: (companyId: string) => `items:${companyId}`,
  itemSearch: (query: string) => `items:search:${query}`,
  
  // العميل
  customer: (id: string) => `customer:${id}`,
  customers: (companyId: string) => `customers:${companyId}`,
  
  // المورد
  supplier: (id: string) => `supplier:${id}`,
  suppliers: (companyId: string) => `suppliers:${companyId}`,
  
  // الحساب
  account: (id: string) => `account:${id}`,
  chartOfAccounts: (companyId: string) => `accounts:${companyId}:tree`,
  
  // التقارير
  report: (type: string, params: string) => `report:${type}:${params}`,
  
  // Dashboard
  dashboardStats: (companyId: string, branchId?: string) =>
    branchId
      ? `dashboard:${companyId}:${branchId}`
      : `dashboard:${companyId}`,
};

/**
 * أوقات انتهاء الصلاحية (بالثواني)
 */
export const cacheTTL = {
  short: 60, // دقيقة
  medium: 300, // 5 دقائق
  long: 3600, // ساعة
  day: 86400, // يوم
  week: 604800, // أسبوع
};
