import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit Trace Logs')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get system audit trace logs' })
  async getLogs() {
    return this.auditService.getLogs();
  }

  @Post('log')
  @ApiOperation({ summary: 'Record a new system trace log entry' })
  async createLog(
    @Body()
    body: {
      user_email: string;
      action: string;
      entity: string;
      role?: string;
      description: string;
      ip_address?: string;
    },
  ) {
    return this.auditService.createLog(body);
  }
}
