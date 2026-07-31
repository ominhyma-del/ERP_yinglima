import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true; // No granular permission check specified for this route
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access Denied: Unauthenticated request.');
    }

    // SUPER_ADMIN & ADMIN bypass module permission checks
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return true;
    }

    const userPerms = user.permissions || {};
    const moduleKey = requirement.module;
    const actionKey = requirement.action.toLowerCase(); // 'view', 'edit', 'delete'

    const modulePerm = userPerms[moduleKey];
    if (!modulePerm || !modulePerm[actionKey]) {
      throw new ForbiddenException(
        `Access Denied: You lack '${requirement.action}' permission for module '${requirement.module}'.`,
      );
    }

    return true;
  }
}
