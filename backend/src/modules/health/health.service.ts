import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TaskQueueService } from '../queue/task-queue.service';
import * as os from 'os';

export interface HealthCheckResponse {
  application: 'Healthy' | 'Unhealthy';
  database: 'Healthy' | 'Unhealthy';
  queue: 'Healthy' | 'Degraded' | 'Unhealthy';
  storage: 'Healthy' | 'Unhealthy';
  memory: string;
  cpu: string;
  uptime: string;
  version: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: TaskQueueService,
  ) { }

  // Lightweight check for the public liveness endpoint — confirms the app can
  // reach the database, without exposing anything about resource usage,
  // uptime, or environment. Deliberately separate from checkHealth() below,
  // which is now gated behind admin auth.
  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    // 1. Application status
    const application = 'Healthy';

    // 2. Database status check
    let database: 'Healthy' | 'Unhealthy' = 'Healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'Unhealthy';
    }

    // 3. Queue status check
    let queue: 'Healthy' | 'Degraded' | 'Unhealthy' = 'Healthy';
    try {
      const metrics = await this.queueService.getQueueMetrics();
      if (metrics.failed > 10) {
        queue = 'Degraded';
      }
    } catch {
      queue = 'Unhealthy';
    }

    // 4. Storage status check
    const storage: 'Healthy' | 'Unhealthy' = 'Healthy';

    // 5. Memory usage metrics
    const memUsage = process.memoryUsage();
    const heapUsedMb = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMb = (memUsage.heapTotal / 1024 / 1024).toFixed(1);
    const memPct = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);
    const memory = `${heapUsedMb} MB / ${heapTotalMb} MB (${memPct}%)`;

    // 6. CPU usage metrics
    const cpus = os.cpus();
    const loadAvg = os.loadavg()[0] || 0;
    const cpuPct = ((loadAvg / (cpus.length || 1)) * 100).toFixed(2);
    const cpu = `${cpuPct}% (${cpus.length || 1} Cores)`;

    // 7. Process Uptime calculation
    const uptimeSec = process.uptime();
    const uptime = this.formatUptime(uptimeSec);

    // 8. System Environment & Version
    const version = process.env.APP_VERSION || '1.0.0';
    const envRaw = process.env.NODE_ENV || 'development';
    const environment = envRaw.charAt(0).toUpperCase() + envRaw.slice(1);

    return {
      application,
      database,
      queue,
      storage,
      memory,
      cpu,
      uptime,
      version,
      environment,
    };
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  }
}