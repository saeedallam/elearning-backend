import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  async update(userId: string, lessonId: string, progressPct: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { section: { include: { course: true } } } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.section.courseId } } });
    if (!enrollment) throw new ForbiddenException('Enroll in the course first');
    const completed = progressPct === 100;
    const row = await this.prisma.lessonProgress.upsert({ where: { userId_lessonId: { userId, lessonId } }, create: { userId, lessonId, progressPct, completedAt: completed ? new Date() : null }, update: { progressPct, completedAt: completed ? new Date() : null, lastAccessedAt: new Date() } });
    const totalLessons = await this.prisma.lesson.count({ where: { section: { courseId: lesson.section.courseId } } });
    const completedLessons = await this.prisma.lessonProgress.count({ where: { userId, completedAt: { not: null }, lesson: { section: { courseId: lesson.section.courseId } } } });
    const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    if (completion === 100 && !enrollment.completedAt) {
      await this.prisma.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
      await this.notifications.create(userId, 'COURSE_COMPLETED', 'Course completed', 'Congratulations on completing your course.');
    }
    return { progress: row, completionPct: completion };
  }
  async courseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!enrollment) throw new ForbiddenException('Enroll in the course first');
    const [totalLessons, completedLessons, progress] = await this.prisma.$transaction([
      this.prisma.lesson.count({ where: { section: { courseId } } }),
      this.prisma.lessonProgress.count({ where: { userId, completedAt: { not: null }, lesson: { section: { courseId } } } }),
      this.prisma.lessonProgress.findMany({ where: { userId, lesson: { section: { courseId } } }, include: { lesson: true }, orderBy: { lastAccessedAt: 'desc' } }),
    ]);
    return { completionPct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0, progress };
  }
}
