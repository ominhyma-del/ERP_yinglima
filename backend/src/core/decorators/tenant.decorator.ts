import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  userId: string;
  companyId: string;
  branchId?: string;
  roles: string[];
  permissions: string[];
}

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext || {
      userId: request.user?.id || '00000000-0000-0000-0000-000000000001',
      companyId: request.headers['x-company-id'] || '00000000-0000-0000-0000-000000000001',
      branchId: request.headers['x-branch-id'] || null,
      roles: request.user?.roles || ['ADMIN'],
      permissions: request.user?.permissions || ['*'],
    };
  },
);
