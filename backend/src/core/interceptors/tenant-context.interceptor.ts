import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extract headers or JWT claims for multi-tenancy
    const companyId = request.headers['x-company-id'] || request.user?.companyId || '11111111-1111-1111-1111-111111111111';
    const branchId = request.headers['x-branch-id'] || request.user?.branchId || null;
    const userId = request.user?.id || '00000000-0000-0000-0000-000000000001';

    request.tenantContext = {
      userId,
      companyId,
      branchId,
      roles: request.user?.roles || ['ADMIN'],
      permissions: request.user?.permissions || ['*'],
    };

    return next.handle();
  }
}
