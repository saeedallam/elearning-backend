import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/common/prisma.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('AuthService', () => {
  it('can be created', async () => {
    const moduleRef = await Test.createTestingModule({ providers: [AuthService, { provide: PrismaService, useValue: {} }, { provide: JwtService, useValue: {} }, { provide: NotificationsService, useValue: {} }] }).compile();
    expect(moduleRef.get(AuthService)).toBeDefined();
  });
});
