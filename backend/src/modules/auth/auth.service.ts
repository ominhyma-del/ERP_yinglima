import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(loginDto: { email: string; password?: string }) {
    const { email, password } = loginDto;
    const cleanEmail = email.trim().toLowerCase();

    // Check seed / local mock admin matching teamStore
    if (cleanEmail === 'admin@yinglima.com' || cleanEmail === 'admin.yinglima@gmail.com') {
      return {
        access_token: 'mock-jwt-token-admin-' + Date.now(),
        user: {
          id: 'admin-default',
          email: 'admin@yinglima.com',
          full_name: 'Yinglima Admin',
          role: 'ADMIN',
          company: 'Yinglima Machinery & Trade (China HQ / India)',
        },
      };
    }

    if (cleanEmail === 'user@yinglima.com') {
      return {
        access_token: 'mock-jwt-token-user-' + Date.now(),
        user: {
          id: 'user-default',
          email: 'user@yinglima.com',
          full_name: 'Yinglima User',
          role: 'USER',
          company: 'F&B Uganda Ingredients Ltd',
        },
      };
    }

    // Try finding in database
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      access_token: 'jwt-token-' + user.id,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company: 'Yinglima Machinery & Trade',
      },
    };
  }

  async register(registerDto: { email: string; full_name: string; password?: string; role?: string }) {
    const cleanEmail = registerDto.email.trim().toLowerCase();

    // Enforce unique email check
    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new BadRequestException(`Email "${cleanEmail}" is already registered. Please login or use a different email.`);
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        full_name: registerDto.full_name,
        role: registerDto.role || 'USER',
        password_hash: registerDto.password || 'default_hashed_pwd',
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      },
    };
  }
}
