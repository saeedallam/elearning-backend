import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async update(userId: string, lessonId: string, progressPct: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.section.courseId;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        completedAt: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Enroll in the course first');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingProgress = await tx.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        select: {
          progressPct: true,
          completedAt: true,
        },
      });

      const effectiveProgress = Math.max(
        existingProgress?.progressPct ?? 0,
        progressPct,
      );

      const completed = effectiveProgress === 100;

      const progress = await tx.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          progressPct: effectiveProgress,
          completedAt: completed ? new Date() : null,
          lastAccessedAt: new Date(),
        },
        update: {
          progressPct: effectiveProgress,
          ...(completed && !existingProgress?.completedAt
            ? { completedAt: new Date() }
            : {}),
          lastAccessedAt: new Date(),
        },
      });

      const totalLessons = await tx.lesson.count({
        where: {
          section: {
            courseId,
          },
        },
      });

      const completedLessons = await tx.lessonProgress.count({
        where: {
          userId,
          completedAt: {
            not: null,
          },
          lesson: {
            section: {
              courseId,
            },
          },
        },
      });

      const completionPct = totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      let courseCompletedNow = false;

      if (completionPct === 100 && !enrollment.completedAt) {
        const updatedEnrollment = await tx.enrollment.updateMany({
          where: {
            id: enrollment.id,
            completedAt: null,
          },
          data: {
            completedAt: new Date(),
          },
        });

        courseCompletedNow = updatedEnrollment.count === 1;
      }

      return {
        progress,
        completionPct,
        courseCompletedNow,
      };
    });

    if (result.courseCompletedNow) {
      await this.notifications.create(
        userId,
        'COURSE_COMPLETED',
        'Course completed',
        'Congratulations on completing your course.',
      );
    }

    return {
      progress: result.progress,
      completionPct: result.completionPct,
    };
  }

  async courseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Enroll in the course first');
    }

    const [totalLessons, completedLessons, progress] =
      await this.prisma.$transaction([
        this.prisma.lesson.count({
          where: {
            section: {
              courseId,
            },
          },
        }),
        this.prisma.lessonProgress.count({
          where: {
            userId,
            completedAt: {
              not: null,
            },
            lesson: {
              section: {
                courseId,
              },
            },
          },
        }),
        this.prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: {
              section: {
                courseId,
              },
            },
          },
          include: {
            lesson: true,
          },
          orderBy: {
            lastAccessedAt: 'desc',
          },
        }),
      ]);

    return {
      completionPct: totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0,
      progress,
    };
  }
}
