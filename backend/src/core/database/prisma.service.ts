import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Successfully connected to database.');
    } catch (error: any) {
      console.warn('⚠️ Warning: Database connection failed during startup:', error?.message || error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
