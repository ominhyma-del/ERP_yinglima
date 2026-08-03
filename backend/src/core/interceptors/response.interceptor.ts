import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { RequestContext } from '../context/request-context';

export interface StandardApiResponse<T> {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
  data: T | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  errors: any[] | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();

    const requestId =
      (request?.headers?.['x-request-id'] as string) ||
      RequestContext.currentRequestId();

    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((res) => {
        let message = 'Operation completed successfully';
        let data: any = res;
        let pagination: any = null;

        // If controller returns structured paginated response
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          if ('data' in res && ('pagination' in res || 'total' in res || 'meta' in res)) {
            data = res.data;
            pagination = res.pagination || res.meta || ('total' in res ? {
              total: res.total,
              page: res.page,
              limit: res.limit,
              totalPages: res.totalPages || Math.ceil(res.total / (res.limit || 1)),
            } : null);
            message = res.message || message;
          } else if ('message' in res && 'data' in res) {
            message = res.message;
            data = res.data;
            pagination = res.pagination || null;
          }
        }


        return {
          success: true,
          message,
          requestId,
          timestamp,
          data: data ?? null,
          pagination: pagination ?? null,
          errors: null,
        };
      }),
    );
  }
}
