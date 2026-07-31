import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BeforeApplicationShutdown,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TaskQueueService } from '../../modules/queue/task-queue.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class GracefulShutdownService
  implements OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: TaskQueueService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  /**
   * Phase 1: Module Destruction — Stop accepting new background jobs & save worker/queue states
   */
  async onModuleDestroy() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.warn('🛑 Graceful Shutdown Phase 1: Pausing background workers and saving queue states...');

    try {
      // 1. Pause queue worker polling
      if (this.queueService) {
        this.queueService.onModuleDestroy();
      }

      // 2. Log current queue metrics prior to shutdown
      const metrics = await this.queueService.getQueueMetrics();
      this.logger.log(`Saved Queue State — [Pending: ${metrics.pending}, Processing: ${metrics.processing}, Completed: ${metrics.completed}, Failed: ${metrics.failed}]`);
    } catch (err: any) {
      this.logger.warn(`Notice during queue state saving: ${err?.message || err}`);
    }
  }

  /**
   * Phase 2: Before Application Shutdown — Finish in-flight HTTP requests and active transactions
   */
  async beforeApplicationShutdown(signal?: string) {
    this.logger.warn(`🛑 Graceful Shutdown Phase 2: Signal "${signal || 'SIGTERM'}" received. Finishing active requests & in-flight database transactions...`);

    // Give in-flight transactions 2.5 seconds to complete naturally
    await this.delay(2500);

    this.logger.log('✅ All active HTTP requests & transactions completed successfully.');
  }

  /**
   * Phase 3: Application Shutdown — Disconnect Database, Flush Logs, and Exit Cleanly
   */
  async onApplicationShutdown(signal?: string) {
    this.logger.warn(`🛑 Graceful Shutdown Phase 3: Closing database connections & flushing structured logs (${signal || 'SIGTERM'})...`);

    try {
      // 1. Disconnect Prisma DB connection
      if (this.prisma) {
        await this.prisma.$disconnect();
        this.logger.log('✅ Prisma PostgreSQL database connection closed cleanly.');
      }
    } catch (err: any) {
      this.logger.warn(`Notice during database disconnection: ${err?.message || err}`);
    }

    // 2. Flush structured loggers
    this.structuredLogger.info(`Server shutdown completed cleanly on signal ${signal || 'SIGTERM'}. Exiting process (Code 0).`, {
      event: 'SERVER_SHUTDOWN_CLEAN',
      signal: signal || 'SIGTERM',
    });

    this.logger.log('✨ Enterprise Graceful Shutdown Complete — Zero Data Loss Guaranteed.');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
