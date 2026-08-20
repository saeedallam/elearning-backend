import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { EnrollmentsService } from './enrollments.service';
@ApiTags('enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}
  @Post(':courseId') enroll(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) { return this.service.enroll(req.user.id, courseId); }
  @Get() mine(@Req() req: AuthenticatedRequest) { return this.service.myEnrollments(req.user.id); }
  @Get(':id') one(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.service.getOne(req.user.id, id); }
}
