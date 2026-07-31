import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface RecoveryReport {
  stuckJobsRecovered: number;
  failedJobsRescheduled: number;
  pendingImportsRecovered: number;
  pendingExportsRecovered: number;
  pendingUploadsRecovered: number;
  pendingNotificationsRecovered: number;
  pendingAiRequestsRecovered: number;
  pendingTallySyncsRecovered: number;
  timestamp: string;
}

@Injectable()
export class RecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically executes crash recovery scanning when NestJS boots up.
   */
  async onApplicationBootstrap() {
    this.logger.log('🚀 NestJS Server Started — Initiating Automated Crash Recovery & Task Restoration...');
    await this.recoverInterruptedOperations();
  }

  /**
   * Main recovery scanner: Detects incomplete operations, resets stuck jobs, and resumes background queues.
   */
  async recoverInterruptedOperations(): Promise<RecoveryReport> {
    const report: RecoveryReport = {
      stuckJobsRecovered: 0,
      failedJobsRescheduled: 0,
      pendingImportsRecovered: 0,
      pendingExportsRecovered: 0,
      pendingUploadsRecovered: 0,
      pendingNotificationsRecovered: 0,
      pendingAiRequestsRecovered: 0,
      pendingTallySyncsRecovered: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Recover Unfinished Database Operations / Stuck Jobs (Status: PROCESSING -> PENDING)
      const stuckJobs = await this.prisma.taskQueue.findMany({
        where: { status: 'PROCESSING' },
      });

      if (stuckJobs.length > 0) {
        await this.prisma.taskQueue.updateMany({
          where: { status: 'PROCESSING' },
          data: {
            status: 'PENDING',
            error_log: 'Job automatically recovered and re-queued after server restart',
          },
        });
        report.stuckJobsRecovered = stuckJobs.length;
        this.logger.warn(`Recovered ${stuckJobs.length} stuck processing job(s) left incomplete during server shutdown.`);
      }

      // 2. Recover Failed Jobs with remaining retries (Status: FAILED -> PENDING)
      const recoverableFailed = await this.prisma.taskQueue.findMany({
        where: {
          status: 'FAILED',
          retries: { lt: this.prisma.taskQueue.fields.max_retries },
        },
      });

      if (recoverableFailed.length > 0) {
        await this.prisma.taskQueue.updateMany({
          where: {
            status: 'FAILED',
            retries: { lt: 5 },
          },
          data: {
            status: 'PENDING',
            scheduled_at: new Date(),
          },
        });
        report.failedJobsRescheduled = recoverableFailed.length;
      }

      // 3. Scan & Count Specific Interrupted Task Categories
      const pendingTasks = await this.prisma.taskQueue.findMany({
        where: { status: 'PENDING' },
      });

      for (const task of pendingTasks) {
        switch (task.task_type) {
          case 'BULK_SUPPLIER_IMPORT':
          case 'BULK_BUYER_IMPORT':
          case 'BULK_PRODUCT_IMPORT':
          case 'BULK_INQUIRY_IMPORT':
            report.pendingImportsRecovered++;
            break;
          case 'BULK_DATA_EXPORT':
            report.pendingExportsRecovered++;
            break;
          case 'PENDING_STORAGE_UPLOAD_RETRY':
            report.pendingUploadsRecovered++;
            break;
          case 'NOTIFICATION_DISPATCH_RETRY':
            report.pendingNotificationsRecovered++;
            break;
          case 'AI_REQUEST_QUEUE':
            report.pendingAiRequestsRecovered++;
            break;
          case 'TALLY_SYNC_QUEUE':
            report.pendingTallySyncsRecovered++;
            break;
        }
      }

      this.logger.log(
        `✅ Recovery Scan Complete: Restored [Imports: ${report.pendingImportsRecovered}, Exports: ${report.pendingExportsRecovered}, Uploads: ${report.pendingUploadsRecovered}, Notifications: ${report.pendingNotificationsRecovered}, AI: ${report.pendingAiRequestsRecovered}, Tally: ${report.pendingTallySyncsRecovered}]`,
      );

      return report;
    } catch (error: any) {
      this.logger.warn(`Recovery service scan encountered database notice: ${error?.message || error}`);
      return report;
    }
  }

  /**
   * Public helper to manually trigger system recovery scan via API.
   */
  async manualSystemRecovery(): Promise<RecoveryReport> {
    this.logger.log('Manual system recovery scan triggered by Administrator.');
    return this.recoverInterruptedOperations();
  }
}
