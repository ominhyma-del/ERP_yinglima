import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { TaskQueueService } from '../../modules/queue/task-queue.service';
import { RetryService } from './retry.service';

export interface FallbackOptions<T, F> {
  primary: () => Promise<T>;
  fallback: (error: any) => Promise<F>;
  onFallbackUsed?: (error: any, fallbackResult: F) => void;
  contextName?: string;
  isCritical?: boolean;
}

export interface FallbackResult<T> {
  data: T;
  usedFallback: boolean;
  error?: string;
}

@Injectable()
export class FallbackService {
  private readonly logger = new Logger(FallbackService.name);

  constructor(
    private readonly retryService: RetryService,
    private readonly queueService?: TaskQueueService,
  ) {}

  /**
   * Generic Graceful Degradation Wrapper.
   * Executes primary work; if primary fails, seamlessly switches to fallback logic.
   */
  async execute<T, F>(options: FallbackOptions<T, F>): Promise<T | F> {
    const { primary, fallback, onFallbackUsed, contextName = 'Operation', isCritical = false } = options;

    try {
      return await primary();
    } catch (error: any) {
      this.logger.warn(`[${contextName}] Primary execution failed: ${error?.message || error}. Triggering fallback handler...`);

      try {
        const fallbackResult = await fallback(error);
        if (onFallbackUsed) {
          onFallbackUsed(error, fallbackResult);
        }
        return fallbackResult;
      } catch (fallbackError: any) {
        this.logger.error(`[${contextName}] Both primary and fallback handlers failed!`, fallbackError?.stack);

        if (isCritical) {
          throw new HttpException(
            {
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              errorCode: 'EXTERNAL_SERVICE_ERROR',
              message: `[${contextName}] Critical system component unavailable`,
              details: [],
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        // Non-critical operations must never crash the main business transaction
        return null as any;
      }
    }
  }

  /**
   * AI Service Fallback: If AI endpoint is down, queue the request in TaskQueue and return fallback value.
   */
  async executeAiWithFallback<T>(
    primaryAiCall: () => Promise<T>,
    fallbackValue: T,
    aiTaskPayload?: any,
  ): Promise<T> {
    return this.execute({
      contextName: 'AI-Service-Degradation',
      isCritical: false,
      primary: () => this.retryService.retryAiService(primaryAiCall),
      fallback: async (err) => {
        this.logger.warn(`AI Service offline (${err?.message}). Queuing AI task for background processing.`);
        if (this.queueService && aiTaskPayload) {
          await this.queueService.enqueue({
            task_type: 'AI_REQUEST_QUEUE',
            payload: aiTaskPayload,
          });
        }
        return fallbackValue;
      },
    });
  }

  /**
   * Cloud Storage Fallback: If upload fails, mark status as PENDING and queue retry.
   */
  async executeStorageWithFallback<T>(
    uploadCall: () => Promise<T>,
    fallbackPendingResult: T,
    uploadMetadata?: any,
  ): Promise<T> {
    return this.execute({
      contextName: 'Storage-Upload-Degradation',
      isCritical: false,
      primary: () => this.retryService.retrySupabaseStorage(uploadCall),
      fallback: async (err) => {
        this.logger.warn(`Cloud storage upload failed (${err?.message}). Marking file as PENDING_UPLOAD.`);
        if (this.queueService && uploadMetadata) {
          await this.queueService.enqueue({
            task_type: 'PENDING_STORAGE_UPLOAD_RETRY',
            payload: uploadMetadata,
          });
        }
        return fallbackPendingResult;
      },
    });
  }

  /**
   * Notification Dispatch Fallback: If SMS/Email fails, persist to queue and return success status.
   */
  async executeNotificationWithFallback(
    sendCall: () => Promise<void>,
    notificationPayload: any,
  ): Promise<{ sent: boolean; queued: boolean }> {
    return this.execute({
      contextName: 'Notification-Dispatch',
      isCritical: false,
      primary: async () => {
        await this.retryService.retryEmailService(sendCall);
        return { sent: true, queued: false };
      },
      fallback: async (err) => {
        this.logger.warn(`Notification dispatch failed (${err?.message}). Persisting to background retry queue.`);
        if (this.queueService) {
          await this.queueService.enqueue({
            task_type: 'NOTIFICATION_DISPATCH_RETRY',
            payload: notificationPayload,
          });
        }
        return { sent: false, queued: true };
      },
    });
  }

  /**
   * Tally Sync Fallback: If Tally offline, queue sync payload automatically without stopping main ERP transaction.
   */
  async executeTallySyncWithFallback(
    syncCall: () => Promise<void>,
    tallyVoucherPayload: any,
  ): Promise<{ synced: boolean; queued: boolean }> {
    return this.execute({
      contextName: 'Tally-ERP-Sync',
      isCritical: false,
      primary: async () => {
        await syncCall();
        return { synced: true, queued: false };
      },
      fallback: async (err) => {
        this.logger.warn(`Tally ERP instance offline or unreachable (${err?.message}). Auto-queuing voucher sync.`);
        if (this.queueService) {
          await this.queueService.enqueue({
            task_type: 'TALLY_SYNC_QUEUE',
            payload: tallyVoucherPayload,
          });
        }
        return { synced: false, queued: true };
      },
    });
  }

  /**
   * Database Failover / Read-Replica Fallback: Retries primary DB, then falls back to read-replica or friendly error.
   */
  async executeDatabaseWithFallback<T>(
    primaryDbCall: () => Promise<T>,
    readReplicaFallbackCall?: () => Promise<T>,
  ): Promise<T> {
    return this.execute({
      contextName: 'Database-High-Availability',
      isCritical: true,
      primary: () => this.retryService.retryDatabaseOperation(primaryDbCall),
      fallback: async (err) => {
        if (readReplicaFallbackCall) {
          this.logger.warn('Primary database unreachable. Switching query to Read Replica...');
          return await readReplicaFallbackCall();
        }
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            errorCode: 'DATABASE_ERROR',
            message: 'Database service is temporarily unavailable. Please try again shortly.',
            details: [],
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      },
    });
  }
}
