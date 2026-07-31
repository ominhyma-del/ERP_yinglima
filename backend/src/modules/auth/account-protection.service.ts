import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SecurityException } from '../../core/exceptions/security.exception';

@Injectable()
export class AccountProtectionService {
  private readonly logger = new Logger(AccountProtectionService.name);

  // Maximum allowed consecutive failed login attempts before temporary lockout
  private readonly maxFailedAttempts = 5;
  // Lockout duration in milliseconds (15 minutes)
  private readonly lockoutDurationMs = 15 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies if account is currently locked due to temporary failed attempt limit or permanent admin ban.
   */
  async verifyAccountLockState(user: any): Promise<void> {
    if (!user) return;

    if (user.is_permanently_locked) {
      this.logger.warn(`Locked account login blocked: ${user.email} (Permanent Admin Lock)`);
      throw new SecurityException(
        'ACCOUNT_LOCKED',
        'Account disabled: Your account has been permanently locked by an administrator. Contact security support.',
      );
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000));
      this.logger.warn(`Temporarily locked account login blocked: ${user.email} (${remainingMins} mins left)`);
      throw new SecurityException(
        'ACCOUNT_LOCKED',
        `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMins} minutes.`,
      );
    }
  }

  /**
   * Increments failed attempt counter upon invalid password. Triggers 15-minute lock upon reaching limit.
   */
  async handleFailedLoginAttempt(user: any): Promise<void> {
    if (!user) return;

    const attempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil: Date | null = null;

    if (attempts >= this.maxFailedAttempts) {
      lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
      this.logger.warn(`Account ${user.email} temporarily locked for 15 minutes after ${attempts} failed attempts.`);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: attempts,
        locked_until: lockedUntil,
      },
    });
  }

  /**
   * Resets failed login counters upon successful authentication.
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
      },
    });
  }

  /**
   * Admin Utility: Unlocks user account immediately.
   */
  async unlockAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        is_permanently_locked: false,
      },
    });
    this.logger.log(`Account ${userId} unlocked by Administrator.`);
  }

  /**
   * Admin Utility: Permanently locks user account.
   */
  async lockAccountPermanently(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        is_permanently_locked: true,
      },
    });
    this.logger.warn(`Account ${userId} permanently locked by Administrator.`);
  }
}
