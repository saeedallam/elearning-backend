import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import { PrismaService } from "../../common/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.role === Role.INSTRUCTOR ? Role.INSTRUCTOR : Role.STUDENT;
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role,
      },
    });
    await this.notifications.create(
      user.id,
      "SECURITY",
      "Welcome",
      "Your account has been created.",
    );
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    )
      throw new UnauthorizedException("Invalid credentials");
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !row ||
      row.revokedAt ||
      row.expiresAt < new Date() ||
      !row.user.isActive
    )
      throw new UnauthorizedException("Invalid refresh token");
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(row.user.id, row.user.email, row.user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(userId: string, email: string, role: Role) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessExpiresIn =
      process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
    const refreshExpiresIn =
      process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured",
      );
    }

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn as JwtSignOptions["expiresIn"],
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: "refresh" },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"],
      },
    );

    const refreshExpiresAt = this.parseDuration(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + refreshExpiresAt),
      },
    });

    return { accessToken, refreshToken };
  }

  private parseDuration(value: string): number {
    const match = value.trim().match(/^(\d+)([smhd])$/i);

    if (!match) {
      throw new Error(
        `Unsupported JWT refresh duration: ${value}. Use formats such as 15m, 1h, 7d, or 30s.`,
      );
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }
}
