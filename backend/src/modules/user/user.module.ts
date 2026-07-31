import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, TransactionService],
  exports: [UserService],
})
export class UserModule {}
