import { Module, Global } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { PrismaModule } from '../database/prisma.module';
import { TaskQueueModule } from '../../modules/queue/task-queue.module';
import { LoggingModule } from '../logging/logging.module';

@Global()
@Module({
  imports: [PrismaModule, TaskQueueModule, LoggingModule],
  providers: [GracefulShutdownService],
  exports: [GracefulShutdownService],
})
export class LifecycleModule {}
