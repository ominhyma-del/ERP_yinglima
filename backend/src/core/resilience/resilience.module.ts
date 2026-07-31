import { Module, Global } from '@nestjs/common';
import { RetryService } from './retry.service';
import { FallbackService } from './fallback.service';
import { RecoveryService } from './recovery.service';
import { TaskQueueModule } from '../../modules/queue/task-queue.module';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  imports: [TaskQueueModule],
  providers: [RetryService, FallbackService, RecoveryService, PrismaService],
  exports: [RetryService, FallbackService, RecoveryService],
})
export class ResilienceModule {}
