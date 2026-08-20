import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], controllers: [EnrollmentsController], providers: [EnrollmentsService, PrismaService], exports: [EnrollmentsService] })
export class EnrollmentsModule {}
