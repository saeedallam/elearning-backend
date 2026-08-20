import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService, NotificationJob } from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly service: NotificationsService) { super(); }
  async process(job: Job<NotificationJob>) {
    if (job.name === 'create-notification') return this.service.persist(job.data);
    return undefined;
  }
}
