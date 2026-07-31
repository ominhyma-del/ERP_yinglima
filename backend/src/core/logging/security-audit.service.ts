import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface SecurityAuditEvent {
  userId?: string | null;
  email: string;
  eventType: string; // e.g. LOGIN, LOGOUT, PASSWORD_CHANGE, FAILED_LOGIN, ROLE_CHANGE, SESSION_TERMINATED
  action: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asynchronous, Non-Blocking Security Event Logger.
   * Dispatches log insertion in background to guarantee zero latency penalty on main HTTP threads.
   */
  logEvent(event: SecurityAuditEvent): void {
    setImmediate(async () => {
      try {
        await this.prisma.securityAuditLog.create({
          data: {
            user_id: event.userId || null,
            email: event.email,
            event_type: event.eventType,
            action: event.action,
            ip_address: event.ipAddress || '127.0.0.1',
            user_agent: event.userAgent || 'Browser',
            request_id: event.requestId || null,
            status: event.status,
            details: event.details || {},
          },
        });

        this.logger.log(`[Security Audit] ${event.eventType} - ${event.action} (${event.email}) -> ${event.status}`);
      } catch (err: any) {
        this.logger.warn(`Failed to persist security audit event: ${err?.message || err}`);
      }
    });
  }
}
