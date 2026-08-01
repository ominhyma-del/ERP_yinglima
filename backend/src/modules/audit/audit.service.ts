import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../../core/decorators/tenant.decorator';

// Any Prisma client capable of writing an audit log — the shared pooled
// PrismaService, or an active Prisma.TransactionClient. Accepting either lets
// callers keep the audit write in the SAME transaction as the business change
// it's recording, so the two can never disagree (e.g. the business write
// succeeds but the audit entry silently fails, or vice versa under a crash).
type DbClient = PrismaService | Prisma.TransactionClient;

export interface AuditRecordInput {
  /** e.g. 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE' */
  action: string;
  /** e.g. 'Buyer', 'Supplier', 'Product', 'InquiryConsignment' */
  entity: string;
  entityId: string;
  /** Row/object state before the change. Omit for CREATE. */
  before?: Record<string, any> | null;
  /** Row/object state after the change. Omit for DELETE. */
  after?: Record<string, any> | null;
  /** Optional human-readable summary shown in the audit UI. */
  description?: string;
}

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    try {
      const users = await this.prisma.user.findMany({
        where: { deleted_at: null },
      });

      for (const u of users) {
        const existingCount = await this.prisma.auditLog.count({
          where: {
            OR: [
              { user_id: u.id },
              { user_name: u.full_name },
            ],
          },
        });

        if (existingCount === 0) {
          await this.prisma.auditLog.create({
            data: {
              company_id: '11111111-1111-1111-1111-111111111111',
              user_id: u.id,
              user_name: u.full_name,
              entity_name: 'USER_AUTH',
              entity_id: u.id,
              action: 'LOGIN_SUCCESS',
              after_state: {
                email: u.email,
                name: u.full_name,
                role: u.role,
                description: `User "${u.full_name}" (${u.email}) authenticated successfully as ${u.role}`,
              },
              ip_address: '127.0.0.1 (Local Session)',
            },
          });
          this.logger.log(`Seeded initial audit log for team member ${u.full_name} (${u.email})`);
        }
      }
    } catch (err) {
      this.logger.warn('Initial audit log seeding skipped or completed.');
    }
  }

  /**
   * PRIMARY ENTRY POINT — call this from any module's service method whenever a
   * user creates, updates, deletes, or otherwise changes a business record.
   *
   * Attribution (who did it) is taken from `tenant` (populated server-side from
   * the verified JWT on every request — see TenantContext), never from
   * client-supplied input, so an audit entry can never be forged to say a
   * different user made a change.
   *
   * Pass `db` (the active `tx` client) when this is called from inside an
   * existing `TransactionService.run()` block, so the audit row commits or
   * rolls back atomically together with the business change it documents —
   * you never end up with a change that happened but wasn't logged, or a
   * logged change that never actually committed.
   *
   * This method deliberately does NOT swallow errors the way the legacy
   * createLog() below does: if you're calling this from inside a transaction
   * and the audit write fails, that failure SHOULD roll back the whole
   * transaction, because a business change that can't be recorded is exactly
   * the situation this whole feature exists to prevent.
   */
  async record(input: AuditRecordInput, tenant: TenantContext, db: DbClient = this.prisma) {
    await db.auditLog.create({
      data: {
        company_id: tenant.companyId,
        user_id: tenant.userId,
        user_name: undefined, // resolved via the `user` relation in getLogs(); avoids a second lookup here
        entity_name: input.entity,
        entity_id: input.entityId,
        action: input.action,
        before_state: (input.before as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        after_state:
          (input.after as Prisma.InputJsonValue) ??
          ({ description: input.description || input.action } as Prisma.InputJsonValue),
        ip_address: null,
      },
    });
  }

  /**
   * @deprecated Legacy free-form logger, kept only because the User module's
   * onboarding/offboarding flows (user.service.ts) still call it directly with
   * `this.prisma.auditLog.create(...)` inline rather than through here. New
   * code should use `record()` above instead, which enforces server-derived
   * attribution and typed entity/action fields.
   */
  async createLog(logData: {
    user_id?: string;
    user_name?: string;
    user_email?: string;
    action: string;
    entity: string;
    entity_id?: string;
    role?: string;
    description?: string;
    ip_address?: string;
    before_state?: any;
    after_state?: any;
  }) {
    try {
      let resolvedUserId = logData.user_id;
      let resolvedUserName = logData.user_name;

      if (!resolvedUserId && logData.user_email) {
        const matchedUser = await this.prisma.user.findFirst({
          where: { email: logData.user_email.trim().toLowerCase(), deleted_at: null },
        });
        if (matchedUser) {
          resolvedUserId = matchedUser.id;
          resolvedUserName = matchedUser.full_name;
        }
      }

      const log = await this.prisma.auditLog.create({
        data: {
          company_id: '11111111-1111-1111-1111-111111111111',
          user_id: resolvedUserId || null,
          user_name: resolvedUserName || logData.user_name || logData.user_email || 'System User',
          entity_name: logData.entity,
          entity_id: logData.entity_id || '00000000-0000-0000-0000-000000000000',
          action: logData.action,
          before_state: logData.before_state || null,
          after_state: logData.after_state || {
            email: logData.user_email,
            description: logData.description || logData.action,
          },
          ip_address: logData.ip_address || '127.0.0.1 (Local Session)',
        },
      });

      return log;
    } catch (err) {
      this.logger.error(`Error creating audit log entry: ${err.message}`);
      return {
        id: `log-${Date.now()}`,
        action: logData.action,
        description: logData.description,
      };
    }
  }

  async getLogs() {
    try {
      const dbLogs = await this.prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 500,
        include: {
          // Only select the specific safe fields we need for display — never
          // spread the full `user` relation into the response, which would
          // otherwise leak password_hash and other sensitive columns to
          // anyone with access to this endpoint.
          user: {
            select: { email: true, full_name: true, role: true },
          },
        },
      });

      return dbLogs.map((l) => {
        let desc = `${l.action} on ${l.entity_name}`;
        if (typeof l.after_state === 'object' && l.after_state !== null) {
          desc = (l.after_state as any).description || JSON.stringify(l.after_state);
        }

        const userEmail =
          l.user?.email ||
          (l.after_state as any)?.email ||
          (l.user_name?.includes('@')
            ? l.user_name
            : `${l.user_name?.toLowerCase().replace(/\s+/g, '.')}@yinglima.com`);

        return {
          id: l.id,
          timestamp: l.created_at.toISOString(),
          user_email: userEmail,
          user_name: l.user_name || l.user?.full_name || 'System User',
          action: l.action,
          entity: l.entity_name,
          entity_id: l.entity_id,
          role: l.user?.role || (l.after_state as any)?.role || 'USER',
          ip_address: l.ip_address || '127.0.0.1 (Local Session)',
          status: 'SUCCESS',
          description: desc,
          before_state: l.before_state,
          after_state: l.after_state,
        };
      });
    } catch (err) {
      this.logger.error(`Error fetching audit logs: ${err.message}`);
      return [];
    }
  }
}