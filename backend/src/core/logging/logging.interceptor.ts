import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { StructuredLoggerService, LogLevel } from './structured-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const startTime = Date.now();
    const requestId =
      (request.headers['x-request-id'] as string) || `req-${randomUUID()}`;
    
    // Inject request ID into request headers for downstream filter access
    request.headers['x-request-id'] = requestId;

    const user = (request as any).user;
    const userId = user?.id || user?.userId || (request.headers['x-user-id'] as string) || 'ANONYMOUS';
    const companyId = user?.companyId || (request.headers['x-company-id'] as string) || 'DEFAULT_COMPANY';
    
    const ip =
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      request.ip ||
      '127.0.0.1';
    
    const userAgent = request.headers['user-agent'] || 'UNKNOWN_BROWSER';
    const endpoint = request.originalUrl || request.url || '/';
    const method = request.method || 'GET';
    const moduleName = this.extractModule(endpoint);

    return next.handle().pipe(
      tap(() => {
        const responseTimeMs = Date.now() - startTime;
        const statusCode = response.statusCode || 200;

        let level: LogLevel = 'INFO';
        let warningMessage: string | null = null;

        if (statusCode >= 400 && statusCode < 500) {
          level = 'WARNING';
          warningMessage = `Request completed with HTTP ${statusCode}`;
        } else if (statusCode >= 500) {
          level = 'ERROR';
        }

        this.loggerService.logRequest({
          requestId,
          timestamp: new Date().toISOString(),
          level,
          userId,
          companyId,
          ip,
          userAgent,
          endpoint,
          method,
          responseTimeMs,
          statusCode,
          module: moduleName,
          error: null,
          warning: warningMessage,
          metadata: {
            query: this.loggerService.sanitize(request.query),
          },
        });
      }),
      catchError((error) => {
        const responseTimeMs = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;
        const level: LogLevel = statusCode >= 500 ? 'FATAL' : 'ERROR';

        this.loggerService.logRequest({
          requestId,
          timestamp: new Date().toISOString(),
          level,
          userId,
          companyId,
          ip,
          userAgent,
          endpoint,
          method,
          responseTimeMs,
          statusCode,
          module: moduleName,
          error: error?.message || String(error),
          warning: null,
          metadata: {
            query: this.loggerService.sanitize(request.query),
          },
        });
        throw error;
      }),
    );
  }

  private extractModule(path: string): string {
    const cleanPath = path.replace(/^\/api\//, '/').replace(/^\//, '');
    const segments = cleanPath.split('?')[0].split('/');
    return segments[0] ? segments[0].toLowerCase() : 'global';
  }
}
