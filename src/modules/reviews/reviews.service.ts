import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, courseId: string, dto: CreateReviewDto) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!enrollment) throw new ForbiddenException('Only enrolled students can review');
    const exists = await this.prisma.review.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (exists) throw new ConflictException('Review already exists');
    return this.prisma.review.create({ data: { userId, courseId, ...dto } });
  }
  async list(courseId: string) { return this.prisma.review.findMany({ where: { courseId }, include: { user: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } }); }
  async update(userId: string, id: string, dto: CreateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();
    return this.prisma.review.update({ where: { id }, data: dto });
  }
  async remove(userId: string, id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();
    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
