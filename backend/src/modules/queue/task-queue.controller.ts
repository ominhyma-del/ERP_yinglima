import { Controller, Get, Post, Body } from '@nestjs/common';
import { TaskQueueService, EnqueueTaskDto } from './task-queue.service';

@Controller('queue')
export class TaskQueueController {
  constructor(private readonly queueService: TaskQueueService) {}

  @Get('metrics')
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Post('enqueue')
  async enqueue(@Body() dto: EnqueueTaskDto) {
    return this.queueService.enqueue(dto);
  }
}
