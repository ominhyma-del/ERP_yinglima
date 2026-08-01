import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthCheckResponse } from './health.service';
import { Public } from '../../core/decorators/public.decorator';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) { }

  // Minimal, unauthenticated liveness check — this is what load balancers,
  // uptime monitors, and container orchestrators (e.g. a Docker HEALTHCHECK
  // or Kubernetes readiness probe) call, often without any way to attach
  // credentials. It intentionally reveals nothing beyond "is this process up
  // and can it reach the database" — no memory/CPU numbers, no uptime, no
  // environment name.
  @Public()
  @Get()
  async getBasicHealth(): Promise<{ status: 'ok' | 'degraded' }> {
    const isDbReachable = await this.healthService.isDatabaseReachable();
    return { status: isDbReachable ? 'ok' : 'degraded' };
  }

  // Full diagnostics (memory, CPU load, uptime, environment name, queue
  // health) — this used to be served on the public route above. Live
  // resource/uptime metrics and environment info are useful reconnaissance
  // for anyone probing the deployment, so this now requires a valid login
  // and an Admin role, matching how the rest of this API treats
  // operational/internal detail.
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('detailed')
  async getDetailedHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }
}