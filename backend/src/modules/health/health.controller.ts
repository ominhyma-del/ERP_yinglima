import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthCheckResponse } from './health.service';
import { Public } from '../../core/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }
}
