import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async enroll(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!course || course.status !== 'PUBLISHED') {
      throw new NotFoundException('Published course not found');
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
        },
      });

      await this.notifications.create(
        userId,
        'ENROLLMENT',
        'Enrollment confirmed',
        `You enrolled in ${course.title}.`,
      );

      return enrollment;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Already enrolled');
      }

      throw error;
    }
  }

  async myEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  async getOne(userId: string, id: string) {
    const row = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Enrollment not found');
    }

    if (row.userId !== userId) {
      throw new ForbiddenException();
    }

    return row;
  }
}
