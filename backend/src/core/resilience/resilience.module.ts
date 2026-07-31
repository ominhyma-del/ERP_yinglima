import { Module, Global } from '@nestjs/common';
import { RetryService } from './retry.service';
import { FallbackService } from './fallback.service';
import { TaskQueueModule } from '../../modules/queue/task-queue.module';

@Global()
@Module({
  imports: [TaskQueueModule],
  providers: [RetryService, FallbackService],
  exports: [RetryService, FallbackService],
})
export class ResilienceModule {}
