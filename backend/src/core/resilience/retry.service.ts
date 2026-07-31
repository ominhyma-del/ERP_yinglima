import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export interface RetryPolicy {
  maxAttempts?: number;
  delaysMs?: number[]; // e.g. [2000, 5000, 10000]
  useExponentialBackoff?: boolean;
  initialDelayMs?: number; // e.g. 1000
  backoffFactor?: number;  // e.g. 2
  jitter?: boolean;
  shouldRetry?: (error: any) => boolean;
}

export type RetryableOperation<T> = (attempt: number) => Promise<T>;

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  // Default Schedule: Attempt 1 -> 2s -> Attempt 2 -> 5s -> Attempt 3 -> 10s -> Fail
  private readonly defaultDelays = [2000, 5000, 10000];

  /**
   * Executes a work function with configurable retry policy.
   */
  async execute<T>(
    operation: RetryableOperation<T>,
    policy?: RetryPolicy,
    contextName = 'Operation',
  ): Promise<T> {
    const delays = policy?.delaysMs ?? this.defaultDelays;
    const maxAttempts = policy?.maxAttempts ?? delays.length + 1;

    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await operation(attempt);
      } catch (error: any) {
        // Rule: NEVER retry validation errors, auth errors, or client-side bad requests
        if (this.isNonRetryableError(error)) {
          this.logger.warn(
            `[${contextName}] Validation/Client error detected (Attempt ${attempt}). Aborting retries immediately: ${error?.message || error}`,
          );
          throw error;
        }

        // Check custom retry policy if provided
        if (policy?.shouldRetry && !policy.shouldRetry(error)) {
          this.logger.warn(`[${contextName}] Error excluded by custom retry policy. Aborting: ${error?.message}`);
          throw error;
        }

        // If maximum attempts reached, log fatal failure and throw
        if (attempt >= maxAttempts) {
          this.logger.error(
            `[${contextName}] All ${maxAttempts} retry attempts failed. Operation aborted. Error: ${error?.message || error}`,
            error?.stack,
          );
          throw error;
        }

        // Calculate delay duration based on schedule or exponential backoff
        const delayMs = this.calculateDelay(attempt, delays, policy);
        this.logger.warn(
          `[${contextName}] Attempt ${attempt}/${maxAttempts} failed (${error?.message || 'Error'}). Retrying in ${Math.round(delayMs / 1000)}s...`,
        );

        await this.sleep(delayMs);
      }
    }

    throw new HttpException(
      `[${contextName}] Execution failed after maximum retry attempts.`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Helper for Database Reconnect Operations
   */
  async retryDatabaseOperation<T>(operation: RetryableOperation<T>): Promise<T> {
    return this.execute(operation, {
      delaysMs: [1000, 2000, 5000],
      shouldRetry: (err) => this.isDatabaseRetryable(err),
    }, 'Database-Operation');
  }

  /**
   * Helper for AI Microservice / FastAPI Endpoints
   */
  async retryAiService<T>(operation: RetryableOperation<T>): Promise<T> {
    return this.execute(operation, {
      delaysMs: [2000, 5000, 10000],
      shouldRetry: (err) => this.isTransientNetworkOr5xx(err),
    }, 'AI-Service');
  }

  /**
   * Helper for Email / SMTP Dispatching
   */
  async retryEmailService<T>(operation: RetryableOperation<T>): Promise<T> {
    return this.execute(operation, {
      delaysMs: [2000, 5000, 10000],
      shouldRetry: (err) => this.isTransientNetworkOr5xx(err),
    }, 'Email-Service');
  }

  /**
   * Helper for Supabase Cloud Storage Operations
   */
  async retrySupabaseStorage<T>(operation: RetryableOperation<T>): Promise<T> {
    return this.execute(operation, {
      delaysMs: [1500, 3000, 6000],
      shouldRetry: (err) => this.isTransientNetworkOr5xx(err),
    }, 'Supabase-Storage');
  }

  /**
   * Identifies non-retryable errors (Validation, Auth, 400 Bad Request, 422 Unprocessable).
   */
  private isNonRetryableError(error: any): boolean {
    if (!error) return false;

    // NestJS BadRequestException / ValidationPipe errors
    if (error instanceof BadRequestException) return true;

    const status = error?.status || error?.statusCode || error?.response?.statusCode;
    if (status === 400 || status === 401 || status === 403 || status === 422) {
      return true;
    }

    const message = (error?.message || '').toLowerCase();
    if (
      message.includes('validation') ||
      message.includes('invalid input') ||
      message.includes('must be an email') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Identifies transient network or HTTP 5xx errors suitable for retry.
   */
  private isTransientNetworkOr5xx(error: any): boolean {
    if (this.isNonRetryableError(error)) return false;

    const code = error?.code || error?.error?.code;
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'].includes(code)) {
      return true;
    }

    const status = error?.status || error?.statusCode || error?.response?.status;
    if (status && status >= 500) {
      return true;
    }

    return true; // Default to retrying unknown system errors
  }

  private isDatabaseRetryable(error: any): boolean {
    if (this.isNonRetryableError(error)) return false;
    const code = error?.code;
    // Prisma connection errors: P1000, P1001, P1002, P1017, P2034
    if (code && (code.startsWith('P1') || code === 'P2034')) return true;
    return this.isTransientNetworkOr5xx(error);
  }

  private calculateDelay(attempt: number, delays: number[], policy?: RetryPolicy): number {
    let delayMs = delays[attempt - 1] ?? delays[delays.length - 1] ?? 2000;

    if (policy?.useExponentialBackoff) {
      const initial = policy.initialDelayMs ?? 1000;
      const factor = policy.backoffFactor ?? 2;
      delayMs = initial * Math.pow(factor, attempt - 1);
    }

    if (policy?.jitter) {
      const jitterMs = Math.random() * 300;
      delayMs += jitterMs;
    }

    return delayMs;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
