import { randomBytes, createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
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
