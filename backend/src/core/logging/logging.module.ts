import { Module, Global } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  providers: [StructuredLoggerService, LoggingInterceptor, PrismaService],
  exports: [StructuredLoggerService, LoggingInterceptor],
})
export class LoggingModule {}
