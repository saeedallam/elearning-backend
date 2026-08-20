/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const queue = {
    add: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      prisma as any,
      redis as any,
      queue as any,
    );
  });

  it('queues notifications with retry and exponential backoff', async () => {
    queue.add.mockResolvedValue({
      id: 'job-1',
    });

    const result = await service.create(
      'user-1',
      'ENROLLMENT',
      'Enrollment confirmed',
      'Welcome',
    );

    expect(queue.add).toHaveBeenCalledWith(
      'create-notification',
      {
        userId: 'user-1',
        type: 'ENROLLMENT',
        title: 'Enrollment confirmed',
        message: 'Welcome',
      },
      expect.objectContaining({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }),
    );

    expect(result).toEqual({
      queued: true,
      jobId: 'job-1',
    });
  });

  it('marks unread notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.markRead(
      'user-1',
      'notification-1',
    );

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        userId: 'user-1',
        readAt: null,
      },
      data: expect.objectContaining({
        readAt: expect.any(Date),
      }),
    });

    expect(redis.del).toHaveBeenCalledWith(
      'notifications:user-1',
    );

    expect(result.count).toBe(1);
  });
});
