import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'DATABASE_ERROR'
  | 'BUSINESS_RULE_ERROR'
  | 'FILE_UPLOAD_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Request Context
    const requestId =
      (request.headers['x-request-id'] as string) || `req-${randomUUID()}`;
    const timestamp = new Date().toISOString();
    const path = request.url || request.originalUrl || '/';
    const method = request.method || 'GET';
    const userId =
      (request as any).user?.id ||
      (request as any).user?.userId ||
      (request.headers['x-user-id'] as string) ||
      'ANONYMOUS';
    const moduleName = this.extractModuleName(path);

    // 2. Determine HTTP Status Code, Category, and Details
    const { statusCode, errorCode, message, details } = this.analyzeException(exception);

    // 3. Internal Logging (Complete stack trace & metadata)
    this.logger.error(
      `[${requestId}] [${errorCode}] ${method} ${path} - Status: ${statusCode} | User: ${userId} | Module: ${moduleName}`,
      (exception as Error)?.stack || JSON.stringify(exception),
    );

    // 4. Client Response (Standardized JSON, zero stack leakage)
    response.status(statusCode).json({
      success: false,
      requestId,
      timestamp,
      statusCode,
      errorCode,
      message,
      details,
      path,
      method,
    });
  }

  /**
   * Categorizes the incoming exception and extracts user-safe message & details.
   */
  private analyzeException(exception: unknown): {
    statusCode: number;
    errorCode: ErrorCategory;
    message: string;
    details: any[];
  } {
    // A. NestJS HttpExceptions
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res: any = exception.getResponse();

      let message = 'An error occurred during request processing';
      let details: any[] = [];
      let errorCode: ErrorCategory = 'UNKNOWN_ERROR';

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = res.message || res.error || message;
        if (Array.isArray(res.message)) {
          details = res.message;
          message = 'Validation failed for incoming request data';
        }
      }

      // Map HTTP Status Codes to Categories
      switch (statusCode) {
        case HttpStatus.BAD_REQUEST:
          errorCode = details.length > 0 ? 'VALIDATION_ERROR' : 'BUSINESS_RULE_ERROR';
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = 'AUTHENTICATION_ERROR';
          message = message || 'Authentication is required to access this resource';
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = 'AUTHORIZATION_ERROR';
          message = message || 'You do not have permission to access this resource';
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = 'BUSINESS_RULE_ERROR';
          break;
        case HttpStatus.PAYLOAD_TOO_LARGE:
        case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
          errorCode = 'FILE_UPLOAD_ERROR';
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          errorCode = 'BUSINESS_RULE_ERROR';
          break;
        case HttpStatus.REQUEST_TIMEOUT:
          errorCode = 'TIMEOUT_ERROR';
          break;
        case HttpStatus.BAD_GATEWAY:
        case HttpStatus.SERVICE_UNAVAILABLE:
        case HttpStatus.GATEWAY_TIMEOUT:
          errorCode = 'EXTERNAL_SERVICE_ERROR';
          break;
        default:
          errorCode = statusCode >= 500 ? 'UNKNOWN_ERROR' : 'BUSINESS_RULE_ERROR';
          break;
      }

      return { statusCode, errorCode, message, details };
    }

    // B. Prisma / Database Exceptions
    const errObj = exception as any;
    if (
      errObj?.code?.startsWith('P') ||
      errObj?.name?.includes('Prisma') ||
      errObj?.constructor?.name?.includes('Prisma')
    ) {
      let dbMsg = 'A database operation failed';
      let details: any[] = [];

      if (errObj.code === 'P2002') {
        dbMsg = `Duplicate record constraint violation on fields: ${errObj?.meta?.target || 'unique index'}`;
      } else if (errObj.code === 'P2025') {
        dbMsg = 'Target record for update/delete was not found in database';
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'DATABASE_ERROR',
        message: dbMsg,
        details,
      };
    }

    // C. Network / Timeout Low-Level Errors
    if (errObj?.code === 'ECONNREFUSED' || errObj?.code === 'ENOTFOUND') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: 'NETWORK_ERROR',
        message: 'Network connectivity error with upstream database or service',
        details: [],
      };
    }

    if (errObj?.code === 'ETIMEDOUT') {
      return {
        statusCode: HttpStatus.GATEWAY_TIMEOUT,
        errorCode: 'TIMEOUT_ERROR',
        message: 'Operation timed out before completion',
        details: [],
      };
    }

    // D. Unknown / Unhandled Exception (Sanitize stack & credentials)
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'UNKNOWN_ERROR',
      message: 'An unexpected internal system error occurred. Please contact system administrator.',
      details: [],
    };
  }

  /**
   * Extracts module name from the URL path.
   */
  private extractModuleName(path: string): string {
    const cleanPath = path.replace(/^\/api\//, '/').replace(/^\//, '');
    const segments = cleanPath.split('?')[0].split('/');
    return segments[0] ? segments[0].toLowerCase() : 'global';
  }
}
