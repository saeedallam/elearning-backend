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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CourseStatus, Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { Public } from "../../common/decorators/public.decorator";
import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";

@ApiTags("courses")
@ApiBearerAuth()
@Controller("courses")
export class CoursesController {
  constructor(private readonly service: CoursesService) {}
  @Public() @Get() list(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("status") status?: CourseStatus,
  ) {
    return this.service.list({ page, limit, search, categoryId, status });
  }
  @Public() @Get(":id") one(@Param("id") id: string) {
    return this.service.findOne(id);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN) @Post() create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCourseDto,
  ) {
    return this.service.create(req.user.id, dto);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN) @Patch(":id") update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.service.update(id, req.user, dto);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN) @Post(":id/publish") publish(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body("publish") publish = true,
  ) {
    return this.service.publish(id, req.user, publish);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN) @Delete(":id") remove(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.service.remove(id, req.user);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN) @Post(":courseId/sections") section(
    @Req() req: AuthenticatedRequest,
    @Param("courseId") courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.service.createSection(courseId, req.user, dto);
  }
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post("sections/:sectionId/lessons")
  lesson(
    @Req() req: AuthenticatedRequest,
    @Param("sectionId") sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.service.createLesson(sectionId, req.user, dto);
  }
}
