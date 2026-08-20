import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

export interface NotificationJob { userId: string; type: NotificationType; title: string; message: string; }

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService, @InjectQueue('notifications') private readonly queue: Queue) {}

  async create(userId: string, type: NotificationType, title: string, message: string) {
    await this.queue.add('create-notification', { userId, type, title, message } satisfies NotificationJob, { removeOnComplete: 100, removeOnFail: 500 });
    return { queued: true };
  }

  async persist(job: NotificationJob) {
    const row = await this.prisma.notification.create({ data: job });
    await this.redis.del(`notifications:${job.userId}`);
    return row;
  }

  async list(userId: string) {
    const key = `notifications:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) return cached;
    const data = await this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    await this.redis.set(key, data, 60);
    return data;
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    await this.redis.del(`notifications:${userId}`);
    return row;
  }
}
