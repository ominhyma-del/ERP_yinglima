import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountProtectionService } from './account-protection.service';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityAuditService } from '../../core/logging/security-audit.service';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';
import { PrismaModule } from '../../core/database/prisma.module';
import { TransactionService } from '../../core/database/transaction.service';
import { getRequiredJwtSecret } from '../../core/config/jwt-secret';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // SECURITY: no hardcoded fallback here. A committed default secret means
      // anyone who has ever seen this source code (or its git history) can
      // forge a valid JWT for ANY user — including an admin — without ever
      // knowing a real password. getRequiredJwtSecret() throws at startup if
      // JWT_SECRET is missing, so a misconfigured deployment fails loudly
      // instead of silently running with a secret anyone can guess.
      secret: getRequiredJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TransactionService,
    AccountProtectionService,
    PasswordPolicyService,
    SecurityAuditService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    AccountProtectionService,
    PasswordPolicyService,
    SecurityAuditService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule { }