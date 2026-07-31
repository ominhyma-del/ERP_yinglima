import { Module } from '@nestjs/common';
import { TaskQueueService } from './task-queue.service';
import { TaskQueueController } from './task-queue.controller';
import { PrismaService } from '../../core/database/prisma.service';

@Module({
  controllers: [TaskQueueController],
  providers: [TaskQueueService, PrismaService],
  exports: [TaskQueueService],
})
export class TaskQueueModule {}
