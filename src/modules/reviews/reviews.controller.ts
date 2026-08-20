import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Post(':courseId') create(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() dto: CreateReviewDto) { return this.service.create(req.user.id, courseId, dto); }
  @Get('course/:courseId') list(@Param('courseId') courseId: string) { return this.service.list(courseId); }
  @Patch(':id') update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CreateReviewDto) { return this.service.update(req.user.id, id, dto); }
  @Delete(':id') remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.service.remove(req.user.id, id); }
}
