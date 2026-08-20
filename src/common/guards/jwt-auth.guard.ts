import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');
    const token = auth.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token, { secret: process.env.JWT_ACCESS_SECRET ?? 'local-access' });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, isActive: true, email: true } });
      if (!user || !user.isActive) throw new UnauthorizedException('Invalid user');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
