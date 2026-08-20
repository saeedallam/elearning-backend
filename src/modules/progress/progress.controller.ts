import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
@ApiTags('progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}
  @Put('lessons/:lessonId') update(@Req() req: AuthenticatedRequest, @Param('lessonId') lessonId: string, @Body() dto: UpdateProgressDto) { return this.service.update(req.user.id, lessonId, dto.progressPct); }
  @Get('courses/:courseId') course(@Req() req: AuthenticatedRequest, @Param('courseId') courseId: string) { return this.service.courseProgress(req.user.id, courseId); }
}
