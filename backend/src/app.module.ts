import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    SupplierController,
    BuyerController,
    ProductController,
    InquiryController,
    CompanyController,
    AuthController,
    AuditController,
  ],
  providers: [
    PrismaService,
    SupplierService,
    BuyerService,
    ProductService,
    InquiryService,
    CompanyService,
    AuthService,
    AuditService,
  ],
})
export class AppModule {}
