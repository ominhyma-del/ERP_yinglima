import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';
import { getRequiredJwtSecret } from '../config/jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // SECURITY: must be the exact same secret AuthModule signs tokens with —
      // see jwt-secret.ts for why there's no hardcoded fallback here anymore.
      secretOrKey: getRequiredJwtSecret(),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or malformed access token');
    }

    // Refresh tokens must never be usable as access tokens on protected routes.
    if (payload.tokenType === 'refresh') {
      throw new UnauthorizedException('Refresh tokens cannot be used to access this resource.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deleted_at: null },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists or has been deleted.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account has been deactivated. Contact your administrator.');
    }

    if (user.is_permanently_locked || (user.locked_until && new Date(user.locked_until) > new Date())) {
      throw new UnauthorizedException('This account is currently locked.');
    }

    // This becomes `req.user` for every protected route, the PermissionsGuard,
    // the RolesGuard, and controllers like AuthController#me / UserController.
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
      branch: user.branch,
      status: user.status,
      permissions: user.permissions || {},
    };
  }
}