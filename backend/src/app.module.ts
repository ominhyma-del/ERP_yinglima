import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaService } from './core/database/prisma.service';
import { SupplierService } from './modules/supplier/supplier.service';
import { SupplierController } from './modules/supplier/supplier.controller';
import { BuyerService } from './modules/buyer/buyer.service';
import { BuyerController } from './modules/buyer/buyer.controller';
import { ProductService } from './modules/product/product.service';
import { ProductController } from './modules/product/product.controller';
import { InquiryService } from './modules/inquiry/inquiry.service';
import { InquiryController } from './modules/inquiry/inquiry.controller';
import { CompanyService } from './modules/company/company.service';
import { CompanyController } from './modules/company/company.controller';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuditController } from './modules/audit/audit.controller';
import { AuditService } from './modules/audit/audit.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';

import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TaskQueueModule } from './modules/queue/task-queue.module';
import { LoggingModule } from './core/logging/logging.module';
import { LoggingInterceptor } from './core/logging/logging.interceptor';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { AuthModule } from './modules/auth/auth.module';
import { RequestContextMiddleware } from './core/context/request-context.middleware';

import { PrismaModule } from './core/database/prisma.module';
import { TransactionService } from './core/database/transaction.service';
import { ResilienceModule } from './core/resilience/resilience.module';
import { RetryService } from './core/resilience/retry.service';
import { FallbackService } from './core/resilience/fallback.service';
import { RecoveryService } from './core/resilience/recovery.service';

import { HealthModule } from './modules/health/health.module';

import { LifecycleModule } from './core/lifecycle/lifecycle.module';
import { GracefulShutdownService } from './core/lifecycle/graceful-shutdown.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ResilienceModule,
    LoggingModule,
    TaskQueueModule,
    HealthModule,
    LifecycleModule,
    AuthModule,
  ],
  controllers: [
    AppController,
    SupplierController,
    BuyerController,
    ProductController,
    InquiryController,
    CompanyController,
    AuthController,
    AuditController,
    UserController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    PrismaService,
    TransactionService,
    RetryService,
    FallbackService,
    RecoveryService,
    SupplierService,
    BuyerService,
    ProductService,
    InquiryService,
    CompanyService,
    AuthService,
    AuditService,
    UserService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
