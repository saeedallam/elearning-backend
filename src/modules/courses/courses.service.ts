import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CourseStatus, Role } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}
  private key(id: string) { return `course:${id}`; }
  private slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  async create(instructorId: string, dto: CreateCourseDto) {
    const base = this.slugify(dto.title);
    let slug = base, counter = 1;
    while (await this.prisma.course.findUnique({ where: { slug } })) slug = `${base}-${counter++}`;
    return this.prisma.course.create({ data: { ...dto, slug, instructorId, price: dto.price } });
  }

  async update(id: string, user: { id: string; role: Role }, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== Role.ADMIN && course.instructorId !== user.id) throw new ForbiddenException();
    const updated = await this.prisma.course.update({ where: { id }, data: dto });
    await this.redis.del(this.key(id));
    return updated;
  }

  async publish(id: string, user: { id: string; role: Role }, publish: boolean) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== Role.ADMIN && course.instructorId !== user.id) throw new ForbiddenException();
    const status = publish ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
    const updated = await this.prisma.course.update({ where: { id }, data: { status, publishedAt: publish ? new Date() : null } });
    await this.redis.del(this.key(id));
    return updated;
  }

  async remove(id: string, user: { id: string; role: Role }) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== Role.ADMIN && course.instructorId !== user.id) throw new ForbiddenException();
    await this.prisma.course.delete({ where: { id } });
    await this.redis.del(this.key(id));
    return { success: true };
  }

  async findOne(id: string) {
    const cached = await this.redis.get<Record<string, unknown>>(this.key(id));
    if (cached) return cached;
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { category: true, instructor: { select: { id: true, firstName: true, lastName: true } }, sections: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } }, _count: { select: { enrollments: true, reviews: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    await this.redis.set(this.key(id), course, 300);
    return course;
  }

  async list(params: { page?: number; limit?: number; search?: string; categoryId?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 12));

    const where = {
      status: CourseStatus.PUBLISHED,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? { title: { contains: params.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true },
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

  async createSection(courseId: string, user: { id: string; role: Role }, dto: CreateSectionDto) { await this.assertOwner(courseId, user); return this.prisma.section.create({ data: { courseId, ...dto } }); }
  async createLesson(sectionId: string, user: { id: string; role: Role }, dto: CreateLessonDto) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId }, include: { course: true } });
    if (!section) throw new NotFoundException('Section not found');
    await this.assertOwner(section.courseId, user);
    return this.prisma.lesson.create({ data: { sectionId, ...dto } });
  }
  private async assertOwner(courseId: string, user: { id: string; role: Role }) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== Role.ADMIN && course.instructorId !== user.id) throw new ForbiddenException();
  }
}
