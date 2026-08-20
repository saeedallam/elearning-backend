import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

export interface NotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue('notifications')
    private readonly queue: Queue<NotificationJob>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const job = await this.queue.add(
      'create-notification',
      {
        userId,
        type,
        title,
        message,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.debug(
      `Notification queued: jobId=${job.id}, userId=${userId}, type=${type}`,
    );

    return {
      queued: true,
      jobId: job.id,
    };
  }

  async persist(job: NotificationJob) {
    const row = await this.prisma.notification.create({
      data: job,
    });

    await this.redis.del(`notifications:${job.userId}`);

    this.logger.debug(
      `Notification persisted: userId=${job.userId}, type=${job.type}`,
    );

    return row;
  }

  async list(userId: string) {
    const key = `notifications:${userId}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return cached;
    }

    const data = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    await this.redis.set(key, data, 60);

    return data;
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.updateMany({
      where: {
        id,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    await this.redis.del(`notifications:${userId}`);

    return row;
  }
}
