import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { BuyerModule } from './modules/buyer/buyer.module';
import { ProductModule } from './modules/product/product.module';
import { InquiryModule } from './modules/inquiry/inquiry.module';
import { MastersModule } from './modules/masters/masters.module';
import { CompanyModule } from './modules/company/company.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SupplierModule,
    BuyerModule,
    ProductModule,
    InquiryModule,
    MastersModule,
    CompanyModule,
    AuthModule,
    AuditModule,
  ],
})
export class AppModule {}
