import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CourseStatus, Prisma, Role } from '@prisma/client';

type CourseUser = { id: string; role: Role };

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private key(id: string) {
    return `course:${id}`;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(instructorId: string, dto: CreateCourseDto) {
    const base = this.slugify(dto.title);
    let slug = base;
    let counter = 1;

    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    return this.prisma.course.create({
      data: {
        ...dto,
        slug,
        instructorId,
        price: dto.price,
      },
    });
  }

  async update(id: string, user: CourseUser, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role !== Role.ADMIN && course.instructorId !== user.id) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: dto,
    });

    await this.redis.del(this.key(id));
    return updated;
  }

  async publish(id: string, user: CourseUser, publish: boolean) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role !== Role.ADMIN && course.instructorId !== user.id) {
      throw new ForbiddenException();
    }

    const status = publish ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        status,
        publishedAt: publish ? new Date() : null,
      },
    });

    await this.redis.del(this.key(id));
    return updated;
  }

  async remove(id: string, user: CourseUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role !== Role.ADMIN && course.instructorId !== user.id) {
      throw new ForbiddenException();
    }

    await this.prisma.course.delete({ where: { id } });
    await this.redis.del(this.key(id));

    return { success: true };
  }

  async findOne(id: string) {
    const cached = await this.redis.get<Record<string, unknown>>(this.key(id));

    if (cached) {
      return cached;
    }

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.redis.set(this.key(id), course, 300);
    return course;
  }

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 12));

    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            title: {
              contains: params.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createSection(
    courseId: string,
    user: CourseUser,
    dto: CreateSectionDto,
  ) {
    await this.assertOwner(courseId, user);

    try {
      const section = await this.prisma.section.create({
        data: {
          courseId,
          ...dto,
        },
      });

      await this.redis.del(this.key(courseId));
      return section;
    } catch (error) {
      this.handlePositionConflict(error, 'Section position already exists');
    }
  }

  async updateSection(
    sectionId: string,
    user: CourseUser,
    dto: Partial<CreateSectionDto>,
  ) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.assertOwner(section.courseId, user);

    try {
      const updated = await this.prisma.section.update({
        where: { id: sectionId },
        data: dto,
      });

      await this.redis.del(this.key(section.courseId));
      return updated;
    } catch (error) {
      this.handlePositionConflict(error, 'Section position already exists');
    }
  }

  async removeSection(sectionId: string, user: CourseUser) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.assertOwner(section.courseId, user);

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    await this.redis.del(this.key(section.courseId));

    return { success: true };
  }

  async reorderSections(
    courseId: string,
    user: CourseUser,
    ids: string[],
  ) {
    await this.assertOwner(courseId, user);

    const sections = await this.prisma.section.findMany({
      where: { courseId },
      select: { id: true },
      orderBy: { position: 'asc' },
    });

    this.assertSameIds(
      sections.map((section) => section.id),
      ids,
      'Section IDs must contain every section exactly once',
    );

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index++) {
        await tx.section.update({
          where: { id: ids[index] },
          data: { position: -(index + 1) },
        });
      }

      for (let index = 0; index < ids.length; index++) {
        await tx.section.update({
          where: { id: ids[index] },
          data: { position: index + 1 },
        });
      }
    });

    await this.redis.del(this.key(courseId));

    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
    });
  }

  async createLesson(
    sectionId: string,
    user: CourseUser,
    dto: CreateLessonDto,
  ) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.assertOwner(section.courseId, user);

    try {
      const lesson = await this.prisma.lesson.create({
        data: {
          sectionId,
          ...dto,
        },
      });

      await this.redis.del(this.key(section.courseId));
      return lesson;
    } catch (error) {
      this.handlePositionConflict(error, 'Lesson position already exists');
    }
  }

  async updateLesson(
    lessonId: string,
    user: CourseUser,
    dto: Partial<CreateLessonDto>,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.assertOwner(lesson.section.courseId, user);

    try {
      const updated = await this.prisma.lesson.update({
        where: { id: lessonId },
        data: dto,
      });

      await this.redis.del(this.key(lesson.section.courseId));
      return updated;
    } catch (error) {
      this.handlePositionConflict(error, 'Lesson position already exists');
    }
  }

  async removeLesson(lessonId: string, user: CourseUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.assertOwner(lesson.section.courseId, user);

    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    await this.redis.del(this.key(lesson.section.courseId));

    return { success: true };
  }

  async reorderLessons(
    sectionId: string,
    user: CourseUser,
    ids: string[],
  ) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { courseId: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.assertOwner(section.courseId, user);

    const lessons = await this.prisma.lesson.findMany({
      where: { sectionId },
      select: { id: true },
      orderBy: { position: 'asc' },
    });

    this.assertSameIds(
      lessons.map((lesson) => lesson.id),
      ids,
      'Lesson IDs must contain every lesson exactly once',
    );

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index++) {
        await tx.lesson.update({
          where: { id: ids[index] },
          data: { position: -(index + 1) },
        });
      }

      for (let index = 0; index < ids.length; index++) {
        await tx.lesson.update({
          where: { id: ids[index] },
          data: { position: index + 1 },
        });
      }
    });

    await this.redis.del(this.key(section.courseId));

    return this.prisma.lesson.findMany({
      where: { sectionId },
      orderBy: { position: 'asc' },
    });
  }

  private async assertOwner(courseId: string, user: CourseUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role !== Role.ADMIN && course.instructorId !== user.id) {
      throw new ForbiddenException();
    }
  }

  private assertSameIds(
    existingIds: string[],
    requestedIds: string[],
    message: string,
  ) {
    const existing = [...existingIds].sort();
    const requested = [...requestedIds].sort();

    if (
      existing.length !== requested.length ||
      existing.some((id, index) => id !== requested[index])
    ) {
      throw new ConflictException(message);
    }

    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new ConflictException(message);
    }
  }

  private handlePositionConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
