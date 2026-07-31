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

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'yinglima-enterprise-secret-key-2026',
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
export class AuthModule {}
