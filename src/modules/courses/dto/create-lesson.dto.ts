import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
export class CreateLessonDto { @IsString() title!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() contentUrl?: string; @IsOptional() @IsInt() @Min(1) durationSec?: number; @IsInt() @Min(1) position!: number; @IsOptional() @IsBoolean() isPreview?: boolean; }
