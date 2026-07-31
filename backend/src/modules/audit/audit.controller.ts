import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Audit Trace Logs')
@Public()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get non-editable system audit trace logs' })
  async getLogs() {
    return this.auditService.getLogs();
  }

  @Post('log')
  @ApiOperation({ summary: 'Record a new immutable audit trace log entry' })
  async createLog(
    @Body()
    body: {
      user_id?: string;
      user_name?: string;
      user_email: string;
      action: string;
      entity: string;
      entity_id?: string;
      role?: string;
      description?: string;
      ip_address?: string;
    },
  ) {
    return this.auditService.createLog(body);
  }
}
