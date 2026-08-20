import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  NotificationJob,
  NotificationsService,
} from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly service: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>) {
    if (job.name !== 'create-notification') {
      this.logger.warn(`Unknown notification job: ${job.name}`);
      return undefined;
    }

    this.logger.debug(
      `Processing notification job ${job.id}, attempt ${job.attemptsMade + 1}`,
    );

    try {
      const result = await this.service.persist(job.data);

      this.logger.debug(
        `Notification job ${job.id} completed successfully`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Notification job ${job.id} failed on attempt ${
          job.attemptsMade + 1
        }`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}
