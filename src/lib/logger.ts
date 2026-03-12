/**
 * Mayas ERP - Logger
 * نظام التسجيل
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date().toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = `[${this.context}]`;
    const message = entry.message;

    let formatted = `${timestamp} ${level} ${context} ${message}`;

    if (entry.context) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      formatted += ` | Error: ${entry.error.message}\n${entry.error.stack}`;
    }

    return formatted;
  }

  private log(entry: LogEntry) {
    const formatted = this.formatMessage(entry);

    switch (entry.level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted);
        }
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        // يمكن إرسال إلى Sentry هنا
        break;
    }

    // يمكن إرسال إلى خدمة تسجيل خارجية هنا
    // مثل LogDNA, Papertrail, etc.
  }

  debug(message: string, context?: Record<string, any>) {
    this.log({ level: 'debug', message, timestamp: new Date().toISOString(), context });
  }

  info(message: string, context?: Record<string, any>) {
    this.log({ level: 'info', message, timestamp: new Date().toISOString(), context });
  }

  warn(message: string, context?: Record<string, any>) {
    this.log({ level: 'warn', message, timestamp: new Date().toISOString(), context });
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log({ level: 'error', message, timestamp: new Date().toISOString(), error, context });
  }

  // تسجيل أداء
  time(label: string) {
    console.time(`${this.context}:${label}`);
  }

  timeEnd(label: string) {
    console.timeEnd(`${this.context}:${label}`);
  }

  // تسجيل API
  api(method: string, path: string, statusCode: number, duration: number, context?: Record<string, any>) {
    this.info(`API ${method} ${path} - ${statusCode} (${duration}ms)`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    });
  }

  // تسجيل قاعدة البيانات
  db(operation: string, table: string, duration: number, context?: Record<string, any>) {
    this.debug(`DB ${operation} on ${table} (${duration}ms)`, {
      operation,
      table,
      duration,
      ...context,
    });
  }

  // تسجيل المستخدم
  user(action: string, userId: string, context?: Record<string, any>) {
    this.info(`User ${action}`, {
      userId,
      action,
      ...context,
    });
  }

  // تسجيل الأمان
  security(event: string, context?: Record<string, any>) {
    this.warn(`Security: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

/**
 * إنشاء logger جديد
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Logger الافتراضي
 */
export const logger = createLogger('App');
