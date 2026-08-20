import { ProgressService } from '../src/modules/progress/progress.service';

describe('ProgressService', () => {
  const prisma: any = {
    lesson: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    lessonProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const notifications = {
    create: jest.fn(),
  };

  let service: ProgressService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<any>) => callback(prisma),
    );

    service = new ProgressService(
      prisma,
      notifications as any,
    );
  });

  it('rejects progress updates for users who are not enrolled', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lesson-1',
      section: {
        courseId: 'course-1',
      },
    });

    prisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'lesson-1', 50),
    ).rejects.toThrow('Enroll in the course first');

    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('does not allow progress to move backwards', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lesson-1',
      section: {
        courseId: 'course-1',
      },
    });

    prisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      completedAt: null,
    });

    prisma.lessonProgress.findUnique.mockResolvedValue({
      progressPct: 80,
      completedAt: null,
    });

    prisma.lessonProgress.upsert.mockResolvedValue({
      userId: 'user-1',
      lessonId: 'lesson-1',
      progressPct: 80,
      completedAt: null,
    });

    prisma.lesson.count.mockResolvedValue(10);
    prisma.lessonProgress.count.mockResolvedValue(8);

    const result = await service.update(
      'user-1',
      'lesson-1',
      40,
    );

    expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          progressPct: 80,
        }),
      }),
    );

    expect(result.completionPct).toBe(80);
  });
});
