import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../core/decorators/roles.decorator';

// SECURITY: this controller was previously marked @Public(), meaning ANYONE —
// no login required — could read the entire audit trail (every user's every
// action) via GET /audit/logs, and could forge fake log entries via an open
// POST /audit/log with no authentication at all. Both are now fixed:
//   - The class-level @Public() decorator is removed, so the global
//     JwtAuthGuard applies here like every other controller: a valid JWT is
//     required.
//   - GET /audit/logs is further restricted to ADMIN/SUPER_ADMIN via @Roles(),
//     since audit trails are exactly the kind of record regular staff
//     shouldn't be able to browse or scrub through.
//   - The public POST /audit/log endpoint is removed entirely. Audit entries
//     are now written internally by AuditService.record(...), called
//     directly from each module's service methods with the tenant context
//     extracted from the authenticated request — never accepted as
//     unauthenticated, client-supplied input (which would let anyone forge
//     an audit trail entry attributing an action to a different user).
@ApiTags('Audit Trace Logs')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get('logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get non-editable system audit trace logs (Admin only)' })
  async getLogs() {
    return this.auditService.getLogs();
  }
}