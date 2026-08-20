import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

@Module({ controllers: [CoursesController], providers: [CoursesService, PrismaService, RedisService], exports: [CoursesService] })
export class CoursesModule {}
