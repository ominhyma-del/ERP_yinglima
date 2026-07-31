import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { TaskQueueModule } from '../queue/task-queue.module';

@Module({
  imports: [PrismaModule, TaskQueueModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
