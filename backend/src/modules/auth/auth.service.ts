import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';

import { AccountProtectionService } from './account-protection.service';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityAuditService } from '../../core/logging/security-audit.service';
import { SecurityException } from '../../core/exceptions/security.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory rapid request de-duplication locks with timestamp auto-expiration
  private readonly activeLoginLocks = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly txService: TransactionService,
    private readonly jwtService: JwtService,
    private readonly accountProtection: AccountProtectionService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly securityAudit: SecurityAuditService,
  ) { }

  /**
   * Enterprise Secure Login with Rapid Request De-duplication, Multi-Device Session Tracking,
   * Password Hash Verification, Last Login Timestamp, Account Protection Lockout, and Security Audit.
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const cleanEmail = loginDto.email.trim().toLowerCase();

    // 1. Rapid Request De-duplication: rejects a second login attempt for the
    // SAME email only while a prior attempt for that email is still actively
    // in flight (e.g. a double-click or a client-side retry firing before the
    // first response lands). This is intentionally an "is a request currently
    // running" check, not a fixed time window — a fixed window (e.g. "block
    // for 2s no matter what") would incorrectly reject a second legitimate
    // login (different device/tab) that happens to arrive moments after the
    // first one already finished, and would grow worse the longer any single
    // login takes (e.g. under real DB latency, or the timeout case this fixes).
    const lockSetAt = this.activeLoginLocks.get(cleanEmail);
    // Safety-net expiry: if a lock is somehow still present after longer than
    // the transaction's own timeout + maxWait could ever take, treat it as
    // stale/orphaned (e.g. from a process crash mid-request) rather than
    // blocking logins for that email forever. Kept comfortably above the
    // txService.run() timeoutMs (40000) + maxWaitMs (15000) below, so a
    // request that is genuinely still running is never mistaken for orphaned.
    const LOCK_STALE_AFTER_MS = 60000;
    if (lockSetAt && Date.now() - lockSetAt < LOCK_STALE_AFTER_MS) {
      this.logger.warn(`Rapid concurrent login attempt detected for ${cleanEmail}. Rejecting duplicate request.`);
      throw new ConflictException('A login request is already being processed for this account. Please wait.');
    }

    this.activeLoginLocks.set(cleanEmail, Date.now());

    try {
      return await this.txService.run(
        async (tx) => {
          // 2. Find user by email
          const user = await tx.user.findFirst({
            where: { email: cleanEmail, deleted_at: null },
          });

          if (!user) {
            this.securityAudit.logEvent({
              email: cleanEmail,
              eventType: 'FAILED_LOGIN',
              action: 'INVALID_EMAIL',
              ipAddress,
              userAgent,
              status: 'FAILURE',
            });
            throw new SecurityException('INVALID_CREDENTIALS', 'Invalid email or password.');
          }

          // 3. Verify Account Lockout / Protection State
          await this.accountProtection.verifyAccountLockState(user);

          if (user.status === 'INACTIVE') {
            this.securityAudit.logEvent({
              userId: user.id,
              email: cleanEmail,
              eventType: 'FAILED_LOGIN',
              action: 'USER_DEACTIVATED',
              ipAddress,
              userAgent,
              status: 'FAILURE',
            });
            throw new SecurityException('USER_DISABLED', 'Account is deactivated. Contact your administrator.');
          }

          // 3. Password Verification (Supports bcrypt & safe legacy seed upgrade)
          const inputPassword = loginDto.password;
          const storedHash = user.password_hash || '';
          let isPasswordValid = false;
          // Deferred write: rather than issuing `tx.user.update` here for the
          // bcrypt upgrade AND separately later for reset-attempts/last-login,
          // collect any password_hash change here and fold it into the single
          // combined update below. Every extra sequential query inside this
          // transaction adds real, multiplying wall-clock time under network
          // latency to the database — and that latency is a function of
          // wherever THIS SERVER is relative to the database, not of where
          // any individual user is logging in from. Users can and should be
          // able to log in from anywhere; the fix here doesn't assume any
          // particular region for either side — it simply keeps the total
          // number of round trips low and the timeout generous enough that
          // realistic latency, from any location, doesn't tip it over. See
          // the incident where the log showed the bcrypt upgrade succeed,
          // then 24+ seconds pass with no further logged activity before the
          // NEXT query hit "transaction already closed" — nothing was
          // deadlocked, each round trip alone was consuming multiple seconds
          // of real network latency, serially, until they added up past the
          // old 25s timeout.
          let upgradedPasswordHash: string | undefined;

          if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
            isPasswordValid = await bcrypt.compare(inputPassword, storedHash);
          } else {
            // Legacy plain-text check for pre-bcrypt seed accounts only. SECURITY: this must
            // compare against THIS user's own stored value only — never a hardcoded master
            // password, which would let anyone log into ANY legacy account.
            isPasswordValid = !!storedHash && inputPassword === storedHash;
            if (isPasswordValid) {
              // Automatically upgrade legacy plain text password to bcrypt hash on successful login!
              // Hashing itself is CPU-bound and local — no DB round trip here,
              // just prepare the value; the actual write happens in the single
              // combined update further down.
              upgradedPasswordHash = await bcrypt.hash(inputPassword, 10);
              this.logger.log(`Upgrading password storage to bcrypt for user ${user.email}`);
            }
          }

          if (!isPasswordValid) {
            // Pass `tx` so this write happens on the SAME connection/transaction
            // that already holds the lock on this user row, instead of a second
            // pooled connection that would otherwise wait on it forever.
            await this.accountProtection.handleFailedLoginAttempt(user, tx);
            this.securityAudit.logEvent({
              userId: user.id,
              email: cleanEmail,
              eventType: 'FAILED_LOGIN',
              action: 'INVALID_PASSWORD',
              ipAddress,
              userAgent,
              status: 'FAILURE',
            });
            throw new SecurityException('INVALID_CREDENTIALS', 'Invalid email or password.');
          }

          // Reset failed attempts + update last_login_at + (if applicable) commit
          // the bcrypt-upgraded password hash — all in ONE combined update call
          // instead of two or three separate ones. This is the actual fix for
          // the timeout: fewer sequential round trips to the database, which
          // matters most under high network latency (see the comment above on
          // storedHash/upgradedPasswordHash for the full incident this addresses).
          const now = new Date();
          await tx.user.update({
            where: { id: user.id },
            data: {
              failed_login_attempts: 0,
              locked_until: null,
              last_login_at: now,
              ...(upgradedPasswordHash ? { password_hash: upgradedPasswordHash } : {}),
            },
          });

          this.securityAudit.logEvent({
            userId: user.id,
            email: cleanEmail,
            eventType: 'LOGIN',
            action: 'USER_LOGIN_SUCCESS',
            ipAddress,
            userAgent,
            status: 'SUCCESS',
          });

          // 5. Generate JWT Access Token & Refresh Token (Remember Me determines expiration duration)
          const isRememberMe = !!loginDto.rememberMe;
          const accessTokenExpiration = '15m'; // Access token valid for 15 minutes
          const refreshTokenExpirationDays = isRememberMe ? 30 : 1; // 30 days vs 24 hours

          const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
          };

          const accessToken = this.jwtService.sign(payload, { expiresIn: accessTokenExpiration });
          const refreshToken = this.jwtService.sign(
            { ...payload, tokenType: 'refresh' },
            { expiresIn: `${refreshTokenExpirationDays}d` },
          );

          // 6. Multiple Device Login Tracking: Save active session to PostgreSQL UserSession table
          const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
          const sessionExpiresAt = new Date(Date.now() + refreshTokenExpirationDays * 24 * 60 * 60 * 1000);

          const session = await tx.userSession.create({
            data: {
              user_id: user.id,
              refresh_token_hash: refreshTokenHash,
              device_info: this.parseDeviceInfo(userAgent),
              ip_address: ipAddress || '127.0.0.1',
              user_agent: userAgent || 'Browser',
              expires_at: sessionExpiresAt,
              is_active: true,
            },
          });

          // 7. Record Login History
          await this.recordLoginHistory(cleanEmail, user.id, ipAddress, userAgent, 'SUCCESS', tx);

          // 8. Return Sanitized Tokens & User Payload (No sensitive password leakage)
          return {
            accessToken,
            refreshToken,
            sessionId: session.id,
            expiresInSeconds: 15 * 60,
            rememberMe: isRememberMe,
            user: this.sanitizeUser(user),
          };
        }, { timeoutMs: 40000, maxWaitMs: 15000 });
    } finally {
      this.activeLoginLocks.delete(cleanEmail);
    }
  }

  /**
   * Sliding Session & Refresh Token Rotation
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    try {
      // With refreshToken now optional on the DTO (see refresh-token.dto.ts),
      // this case — neither a body token nor a readable cookie — is now a
      // real, reachable path instead of being blocked upstream by validation.
      // Handle it explicitly with a clear message rather than letting
      // jwtService.verify(undefined) throw its own generic library error.
      if (!dto.refreshToken) {
        throw new UnauthorizedException('No active session found. Please log in again.');
      }

      const decoded = this.jwtService.verify(dto.refreshToken);

      if (decoded.tokenType !== 'refresh' || !decoded.sub) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const user = await this.prisma.user.findFirst({
        where: { id: decoded.sub, deleted_at: null, status: 'ACTIVE' },
      });

      if (!user) {
        throw new UnauthorizedException('User session expired or account deactivated.');
      }

      // 1. Check active sessions
      const activeSessions = await this.prisma.userSession.findMany({
        where: {
          user_id: user.id,
          is_active: true,
          expires_at: { gt: new Date() },
        },
      });

      let matchingSession: any = null;
      for (const sess of activeSessions) {
        const isMatch = await bcrypt.compare(dto.refreshToken, sess.refresh_token_hash);
        if (isMatch) {
          matchingSession = sess;
          break;
        }
      }

      // 2. Replay Attack Detection: If token is not in active sessions, check revoked/inactive sessions
      if (!matchingSession) {
        const allSessions = await this.prisma.userSession.findMany({
          where: { user_id: user.id },
        });

        for (const sess of allSessions) {
          const isReplayMatch = await bcrypt.compare(dto.refreshToken, sess.refresh_token_hash);
          if (isReplayMatch) {
            // REPLAY ATTACK DETECTED! Token reuse attempt detected.
            this.logger.error(
              `🚨 SECURITY ALERT: Refresh token replay attack detected for user ${user.email} (IP: ${ipAddress}). Immediately revoking ALL active sessions!`,
            );

            await this.logoutAll(user.id);
            await this.recordLoginHistory(user.email, user.id, ipAddress, userAgent, 'REPLAY_ATTACK_REVOKED_ALL_SESSIONS');

            throw new UnauthorizedException(
              'Security Violation: Attempted reuse of an expired or previously rotated refresh token. For your security, all active sessions have been revoked. Please log in again.',
            );
          }
        }

        throw new UnauthorizedException('Refresh token is invalid or has been revoked.');
      }

      // Generate NEW Access Token & extend sliding session duration
      const payload = { sub: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Extend session expiry timestamp in database
      await this.prisma.userSession.update({
        where: { id: matchingSession.id },
        data: {
          expires_at: newExpiresAt,
          ip_address: ipAddress || matchingSession.ip_address,
          user_agent: userAgent || matchingSession.user_agent,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: dto.refreshToken,
        sessionId: matchingSession.id,
        expiresInSeconds: 15 * 60,
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Session expired. Please log in again.');
    }
  }

  /**
   * Current Device Logout
   */
  async logout(sessionId?: string, refreshToken?: string) {
    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId },
        data: { is_active: false },
      });
      return { message: 'Logged out successfully from this device.' };
    }

    if (refreshToken) {
      try {
        const decoded = this.jwtService.verify(refreshToken);
        const userId = decoded.sub;
        const sessions = await this.prisma.userSession.findMany({
          where: { user_id: userId, is_active: true },
        });

        for (const sess of sessions) {
          const isMatch = await bcrypt.compare(refreshToken, sess.refresh_token_hash);
          if (isMatch) {
            await this.prisma.userSession.update({
              where: { id: sess.id },
              data: { is_active: false },
            });
            break;
          }
        }
      } catch {
        // Silently handle invalid tokens on logout
      }
    }

    return { message: 'Logged out successfully.' };
  }

  /**
   * Forced Logout from ALL Devices
   */
  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false },
    });

    this.logger.log(`Forced all-device logout triggered for userId: ${userId}`);
    return { message: 'Successfully logged out from all devices.' };
  }

  /**
   * Get Active Sessions for Currently Authenticated User
   */
  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { gt: new Date() },
      },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        device_info: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        expires_at: true,
      },
    });

    return sessions;
  }

  private async recordLoginHistory(
    email: string,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string,
    status = 'SUCCESS',
    dbClient?: any,
  ) {
    try {
      const client = dbClient || this.prisma;
      await client.loginHistory.create({
        data: {
          email,
          user_id: userId,
          ip_address: ipAddress || '127.0.0.1',
          user_agent: userAgent || 'Browser',
          status,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Notice recording login history: ${err?.message || err}`);
    }
  }

  private parseDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Mobile Device';
    }
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac PC';
    if (userAgent.includes('Linux')) return 'Linux System';
    return 'Desktop Web Browser';
  }

  private sanitizeUser(user: any) {
    if (!user) return null;
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}