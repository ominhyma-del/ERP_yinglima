import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { TaskQueueService, EnqueueTaskDto, ALLOWED_TASK_TYPES } from './task-queue.service';
import { Roles } from '../../core/decorators/roles.decorator';

// SECURITY: this controller previously had no @Roles/@RequirePermission at
// all. The global JwtAuthGuard still required a valid login, but ANY
// authenticated user — regardless of role — could read internal queue
// metrics and enqueue arbitrary background jobs with no validation of what
// `task_type` values are legitimate, no rate limit, and no ownership
// tracking. That's an easy resource-exhaustion vector (flood the persistent
// queue table with junk rows) even though the current task handlers
// themselves don't do anything dangerous when executed. Restricted to
// ADMIN/SUPER_ADMIN, matching how the rest of this API treats
// operational/internal tooling.
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('queue')
export class TaskQueueController {
  constructor(private readonly queueService: TaskQueueService) { }

  @Get('metrics')
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Post('enqueue')
  async enqueue(@Body() dto: EnqueueTaskDto) {
    // Validate task_type against the known handler allowlist instead of
    // trusting any string — see task-queue.service.ts for why an
    // unrecognized task_type used to silently fall through to a no-op
    // default case rather than being rejected.
    if (!ALLOWED_TASK_TYPES.includes(dto.task_type as any)) {
      throw new BadRequestException(
        `Invalid task_type "${dto.task_type}". Must be one of: ${ALLOWED_TASK_TYPES.join(', ')}.`,
      );
    }
    return this.queueService.enqueue(dto);
  }
}