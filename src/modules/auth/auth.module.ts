import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [JwtModule.register({}), NotificationsModule], controllers: [AuthController], providers: [AuthService, PrismaService], exports: [AuthService] })
export class AuthModule {}
