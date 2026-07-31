import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export interface TransactionOptions {
  timeoutMs?: number;
  maxWaitMs?: number;
  maxRetries?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

export type TransactionWork<T> = (tx: Prisma.TransactionClient) => Promise<T>;

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private static readonly txStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the active transaction client if inside a transaction context, or undefined.
   */
  public getCurrentTransaction(): Prisma.TransactionClient | undefined {
    return TransactionService.txStorage.getStore();
  }

  /**
   * Executes a database work block inside an ACID transaction with automatic commit/rollback,
   * nested transaction reuse, deadlock/serialization retries, and timeout protection.
   */
  async run<T>(
    work: TransactionWork<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const activeTx = this.getCurrentTransaction();

    // 1. Nested Transaction Support: Reuse existing active transaction if already inside one
    if (activeTx) {
      this.logger.debug('Reusing active transaction for nested work block.');
      return work(activeTx);
    }

    const timeoutMs = options?.timeoutMs ?? 10000;
    const maxWaitMs = options?.maxWaitMs ?? 5000;
    const maxRetries = options?.maxRetries ?? 3;
    const isolationLevel = options?.isolationLevel;

    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        // Execute top-level Prisma transaction block
        const result = await this.prisma.$transaction(
          async (tx) => {
            // Bind tx client to AsyncLocalStorage context for nested service calls
            return TransactionService.txStorage.run(tx, () => work(tx));
          },
          {
            timeout: timeoutMs,
            maxWait: maxWaitMs,
            isolationLevel,
          },
        );

        return result;
      } catch (error: any) {
        const isDeadlockOrSerialization = this.isRetryableDatabaseError(error);

        if (isDeadlockOrSerialization && attempt <= maxRetries) {
          const delayMs = Math.pow(2, attempt) * 100 + Math.random() * 50;
          this.logger.warn(
            `Transaction deadlock/serialization conflict detected (Attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delayMs)}ms...`,
          );
          await this.delay(delayMs);
          continue;
        }

        // Standardize & rethrow errors without exposing internal database details
        this.handleTransactionError(error, timeoutMs);
      }
    }

    throw new HttpException(
      'Transaction failed after maximum retry attempts',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Checks if error code is a retryable PostgreSQL deadlock or serialization failure.
   */
  private isRetryableDatabaseError(error: any): boolean {
    if (!error) return false;
    const code = error.code || error.meta?.code;
    const message = (error.message || '').toLowerCase();

    // Prisma P2034: Transaction failed due to a write conflict or a deadlock
    if (code === 'P2034') return true;
    // Postgres 40P01 (Deadlock detected), 40001 (Serialization failure)
    if (message.includes('deadlock') || message.includes('serialization failure') || message.includes('concurrent update')) {
      return true;
    }
    return false;
  }

  /**
   * Maps raw Prisma transaction errors to standardized HTTP exceptions.
   */
  private handleTransactionError(error: any, timeoutMs: number): never {
    this.logger.error(`Transaction rolled back: ${error?.message || String(error)}`, error?.stack);

    if (error instanceof HttpException) {
      throw error;
    }

    const message = (error?.message || '').toLowerCase();

    if (message.includes('timed out') || message.includes('expired') || error?.code === 'P2028') {
      throw new HttpException(
        {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          errorCode: 'TIMEOUT_ERROR',
          message: `Transaction exceeded maximum execution timeout limit of ${timeoutMs}ms and was rolled back.`,
          details: [],
        },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'DATABASE_ERROR',
        message: error?.message || 'Database transaction error encountered. All changes have been safely rolled back.',
        details: [],
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
