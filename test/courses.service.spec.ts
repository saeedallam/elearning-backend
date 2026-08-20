import { CourseStatus, Role } from '@prisma/client';
import { CoursesService } from '../src/modules/courses/courses.service';

describe('CoursesService', () => {
  const prisma = {
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    section: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma as any, redis as any);
  });

  it('lists published courses only', async () => {
    prisma.course.findMany.mockResolvedValue([]);
    prisma.course.count.mockResolvedValue(0);

    prisma.$transaction.mockImplementation(async (queries: Promise<any>[]) => {
      return Promise.all(queries);
    });

    await service.list({
      page: 1,
      limit: 12,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: CourseStatus.PUBLISHED,
        }),
      }),
    );

    expect(prisma.course.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: CourseStatus.PUBLISHED,
        }),
      }),
    );
  });

  it('allows only the course owner or admin to update a course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
    });

    prisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'Updated',
    });

    await service.update(
      'course-1',
      {
        id: 'instructor-1',
        role: Role.INSTRUCTOR,
      },
      {
        title: 'Updated',
      },
    );

    expect(prisma.course.update).toHaveBeenCalled();
  });

  it('rejects course updates from another instructor', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'owner-1',
    });

    await expect(
      service.update(
        'course-1',
        {
          id: 'other-instructor',
          role: Role.INSTRUCTOR,
        },
        {
          title: 'Hacked',
        },
      ),
    ).rejects.toThrow();

    expect(prisma.course.update).not.toHaveBeenCalled();
  });
});
