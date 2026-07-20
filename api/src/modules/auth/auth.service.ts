import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AdminSession {
  adminAccessToken: string;
  expiresInSeconds: number;
}

const ADMIN_SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Email-only login: upsert the user by email and issue a token pair. There is
   * no code/password — access to a paid plan is gated separately by the Payt
   * purchase (a new user lands on the free plan). An email in ADMIN_EMAILS is
   * promoted to admin here (the env var is the source of truth for admins).
   */
  async login(rawEmail: string): Promise<TokenPair> {
    const email = rawEmail.trim().toLowerCase();
    const role = this.isAdminEmail(email) ? 'admin' : undefined;

    const user = await this.prisma.user.upsert({
      where: { email },
      // `role: undefined` is a no-op in Prisma, so a non-admin login never
      // clobbers a role set elsewhere.
      update: { role },
      create: { email, role },
    });

    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: delete the old token, issue a fresh pair.
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user.id, user.email);
  }

  async issueAdminSession(
    userId: string,
    email: string,
    password?: string,
  ): Promise<AdminSession> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user || user.email !== email) {
      throw new UnauthorizedException('Invalid admin session');
    }

    const envAdmin = this.isAdminEmail(user.email);
    if (envAdmin && user.role !== 'admin') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' },
      });
    }

    if (user.role !== 'admin' && !envAdmin) {
      throw new ForbiddenException('Admin role required');
    }

    // Second factor beyond "your email is an admin email": the backoffice
    // password. Enforced only when configured (see assertAdminPassword).
    this.assertAdminPassword(password);

    const adminAccessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, purpose: 'admin' },
      {
        secret: this.adminJwtSecret(),
        expiresIn: `${ADMIN_SESSION_TTL_SECONDS}s`,
      },
    );

    return { adminAccessToken, expiresInSeconds: ADMIN_SESSION_TTL_SECONDS };
  }

  /**
   * Gate the admin step-up behind a backoffice password (ADMIN_PANEL_PASSWORD).
   * Without it, being an admin *email* is the only barrier — and admin emails
   * are easy to guess. When the env var is unset the gate is disabled (so the
   * upgrade doesn't lock anyone out on deploy); a warning is logged so an
   * operator running unprotected notices. Comparison is constant-time on SHA-256
   * digests, which also hides the password length.
   */
  private assertAdminPassword(password?: string): void {
    const expected = this.config.get<string>('ADMIN_PANEL_PASSWORD');
    if (!expected) {
      this.logger.warn(
        'ADMIN_PANEL_PASSWORD is not set — the admin panel has no password gate.',
      );
      return;
    }
    if (!password || !this.constantTimeEquals(password, expected)) {
      throw new UnauthorizedException('Invalid admin password');
    }
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }

  private isAdminEmail(email: string): boolean {
    const raw = this.config.get<string>('ADMIN_EMAILS') ?? '';
    const admins = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return admins.includes(email);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private adminJwtSecret(): string | undefined {
    return (
      this.config.get<string>('ADMIN_JWT_SECRET') ??
      this.config.get<string>('JWT_SECRET')
    );
  }

  private async issueTokens(userId: string, email: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
