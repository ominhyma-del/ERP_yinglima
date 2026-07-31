import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

import { APP_INTERCEPTOR } from '@nestjs/core';
import { TaskQueueModule } from './modules/queue/task-queue.module';
import { LoggingModule } from './core/logging/logging.module';
import { LoggingInterceptor } from './core/logging/logging.interceptor';
import { RequestContextMiddleware } from './core/context/request-context.middleware';

import { PrismaModule } from './core/database/prisma.module';
import { TransactionService } from './core/database/transaction.service';
import { ResilienceModule } from './core/resilience/resilience.module';
import { RetryService } from './core/resilience/retry.service';
import { FallbackService } from './core/resilience/fallback.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ResilienceModule,
    LoggingModule,
    TaskQueueModule,
  ],
  controllers: [
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
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    PrismaService,
    TransactionService,
    RetryService,
    FallbackService,
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
