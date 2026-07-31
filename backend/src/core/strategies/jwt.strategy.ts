import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'yinglima-enterprise-secret-key-2026',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or malformed access token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deleted_at: null, status: 'ACTIVE' },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists or has been deactivated');
    }

    if (user.is_permanently_locked || (user.locked_until && new Date(user.locked_until) > new Date())) {
      throw new UnauthorizedException('User account is currently locked');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
