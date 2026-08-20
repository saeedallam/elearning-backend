import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Public } from '../../common/decorators/public.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Public()
  @Get()
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.list({ page, limit, search, categoryId });
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCourseDto,
  ) {
    return this.service.create(req.user.id, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.service.update(id, req.user, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':id/publish')
  publish(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('publish') publish = true,
  ) {
    return this.service.publish(id, req.user, publish);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.remove(id, req.user);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':courseId/sections')
  section(
    @Req() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.service.createSection(courseId, req.user, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('sections/:sectionId')
  updateSection(
    @Req() req: AuthenticatedRequest,
    @Param('sectionId') sectionId: string,
    @Body() dto: Partial<CreateSectionDto>,
  ) {
    return this.service.updateSection(sectionId, req.user, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('sections/:sectionId')
  removeSection(
    @Req() req: AuthenticatedRequest,
    @Param('sectionId') sectionId: string,
  ) {
    return this.service.removeSection(sectionId, req.user);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':courseId/sections/reorder')
  reorderSections(
    @Req() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.service.reorderSections(courseId, req.user, dto.ids);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('sections/:sectionId/lessons')
  lesson(
    @Req() req: AuthenticatedRequest,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.service.createLesson(sectionId, req.user, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('lessons/:lessonId')
  updateLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Body() dto: Partial<CreateLessonDto>,
  ) {
    return this.service.updateLesson(lessonId, req.user, dto);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('lessons/:lessonId')
  removeLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
  ) {
    return this.service.removeLesson(lessonId, req.user);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('sections/:sectionId/lessons/reorder')
  reorderLessons(
    @Req() req: AuthenticatedRequest,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.service.reorderLessons(sectionId, req.user, dto.ids);
  }
}
