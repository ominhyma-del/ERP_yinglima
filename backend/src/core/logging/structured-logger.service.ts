import { Injectable, LoggerService } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestContext } from '../context/request-context';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';

export interface StructuredLogEntry {
  requestId: string;
  timestamp: string;
  level: LogLevel;
  userId?: string;
  companyId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  responseTimeMs: number;
  statusCode: number;
  module: string;
  error?: string | null;
  warning?: string | null;
  metadata?: any;
}

// Sensitive key patterns to sanitize
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'passwordhash',
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'authorization',
  'secret',
  'api_key',
  'apikey',
  'credit_card',
  'creditcard',
  'cvv',
];

@Injectable()
export class StructuredLoggerService implements LoggerService {
  constructor(private readonly prisma?: PrismaService) {}

  log(message: any, ...optionalParams: any[]) {
    this.info(message, optionalParams[0]);
  }

  debug(message: any, metadata?: any) {
    this.output('DEBUG', message, metadata);
  }

  info(message: any, metadata?: any) {
    this.output('INFO', message, metadata);
  }

  warn(message: any, metadata?: any) {
    this.output('WARNING', message, metadata);
  }

  error(message: any, trace?: string, metadata?: any) {
    this.output('ERROR', message, { ...metadata, trace });
  }

  fatal(message: any, trace?: string, metadata?: any) {
    this.output('FATAL', message, { ...metadata, trace });
  }

  /**
   * Main structured log formatter & emitter
   */
  public logRequest(entry: StructuredLogEntry) {
    const sanitizedEntry = {
      ...entry,
      metadata: entry.metadata ? this.sanitize(entry.metadata) : undefined,
    };

    // Output JSON structured string to stdout
    const jsonOutput = JSON.stringify(sanitizedEntry);
    
    switch (entry.level) {
      case 'DEBUG':
        console.debug(jsonOutput);
        break;
      case 'INFO':
        console.info(jsonOutput);
        break;
      case 'WARNING':
        console.warn(jsonOutput);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(jsonOutput);
        break;
    }

    // Hook for PostgreSQL database storage (AuditLog / SystemLog)
    this.persistToDatabase(sanitizedEntry).catch(() => {});
  }

  private output(level: LogLevel, message: any, metadata?: any) {
    const sanitized = this.sanitize(metadata);
    const entry = {
      requestId: RequestContext.currentRequestId(),
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      metadata: sanitized,
    };
    console.log(JSON.stringify(entry));
  }

  /**
   * Recursively sanitizes object keys to redact sensitive parameters (passwords, tokens).
   */
  public sanitize(obj: any): any {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Future-proof PostgreSQL storage hook using Prisma.
   */
  private async persistToDatabase(entry: StructuredLogEntry) {
    if (!this.prisma) return;
    try {
      if (entry.level === 'ERROR' || entry.level === 'FATAL' || entry.level === 'WARNING') {
        const isUuid = (str?: string) => !!str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
        const companyId = isUuid(entry.companyId) ? entry.companyId! : '11111111-1111-1111-1111-111111111111';
        const userId = isUuid(entry.userId) ? entry.userId : null;

        await this.prisma.auditLog.create({
          data: {
            company_id: companyId,
            user_id: userId,
            user_name: entry.userId && !isUuid(entry.userId) ? entry.userId : undefined,
            entity_name: entry.module || 'SYSTEM',
            entity_id: '00000000-0000-0000-0000-000000000000',
            action: `${entry.method} ${entry.endpoint} [${entry.statusCode}]`,
            before_state: {
              requestId: entry.requestId,
              ip: entry.ip,
              userAgent: entry.userAgent,
              responseTimeMs: entry.responseTimeMs,
            },
            after_state: {
              error: entry.error,
              warning: entry.warning,
            },
            ip_address: entry.ip,
          },
        });
      }
    } catch {
      // Ignore database logging errors so application flow is never disrupted
    }
  }
}
