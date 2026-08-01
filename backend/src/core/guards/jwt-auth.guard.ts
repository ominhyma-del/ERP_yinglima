import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * SECURITY: Do NOT fall back to a fabricated admin identity when authentication
   * fails. A missing/invalid/expired token, or a token belonging to a user who has
   * since been deleted or deactivated, must always be rejected with 401 — never
   * silently upgraded to a full-access account. Any previous "seamless fallback"
   * behavior here was a critical authentication bypass and has been removed.
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const reason =
        info?.message === 'jwt expired'
          ? 'Your session has expired. Please log in again.'
          : info?.message || err?.message || 'Authentication required.';
      throw new UnauthorizedException(reason);
    }
    return user;
  }
}
