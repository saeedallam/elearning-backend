import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseLevel } from '@prisma/client';
export class CreateCourseDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() thumbnail?: string;
  @IsEnum(CourseLevel) level!: CourseLevel;
  @IsNumber() @Min(0) price!: number;
  @IsString() categoryId!: string;
}
