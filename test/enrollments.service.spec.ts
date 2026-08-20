/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { EnrollmentsService } from '../src/modules/enrollments/enrollments.service';

describe('EnrollmentsService', () => {
  const prisma = {
    course: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const notifications = {
    create: jest.fn(),
  };

  let service: EnrollmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EnrollmentsService(
      prisma as any,
      notifications as any,
    );
  });

  it('enrolls a user in a published course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'NestJS',
      status: 'PUBLISHED',
    });

    prisma.enrollment.create.mockResolvedValue({
      id: 'enrollment-1',
      userId: 'user-1',
      courseId: 'course-1',
    });

    const result = await service.enroll('user-1', 'course-1');

    expect(result).toEqual({
      id: 'enrollment-1',
      userId: 'user-1',
      courseId: 'course-1',
    });

    expect(notifications.create).toHaveBeenCalledWith(
      'user-1',
      'ENROLLMENT',
      'Enrollment confirmed',
      'You enrolled in NestJS.',
    );
  });

  it('rejects duplicate enrollment using the database unique constraint', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'NestJS',
      status: 'PUBLISHED',
    });

    prisma.enrollment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
        },
      ),
    );

    await expect(
      service.enroll('user-1', 'course-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(notifications.create).not.toHaveBeenCalled();
  });
});
