import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import * as bcrypt from 'bcrypt';

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  historyLimit: number; // e.g. 5
}

@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);

  private readonly defaultConfig: PasswordPolicyConfig = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    historyLimit: 5,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates plain-text password against configurable complexity policy.
   */
  validateComplexity(password: string, customConfig?: Partial<PasswordPolicyConfig>): void {
    const config = { ...this.defaultConfig, ...customConfig };

    if (!password || password.length < config.minLength) {
      throw new BadRequestException(`Password must be at least ${config.minLength} characters long.`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter (A-Z).');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter (a-z).');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      throw new BadRequestException('Password must contain at least one number (0-9).');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character (!@#$%^&*...).');
    }
  }

  /**
   * Checks if proposed new password matches any of the user's last N historical passwords.
   */
  async checkPasswordHistory(userId: string, newPassword: string, limit = 5): Promise<void> {
    const history = await this.prisma.passwordHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    for (const record of history) {
      const isReused = await bcrypt.compare(newPassword, record.password_hash);
      if (isReused) {
        throw new BadRequestException(
          `Security Policy: You cannot reuse any of your last ${limit} previous passwords. Please choose a new password.`,
        );
      }
    }
  }

  /**
   * Records newly created password hash into PostgreSQL PasswordHistory table.
   */
  async recordPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        user_id: userId,
        password_hash: passwordHash,
      },
    });
  }
}
