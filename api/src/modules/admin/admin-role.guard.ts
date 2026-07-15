import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Enforces role=admin.
 *
 * The JWT only carries `{ userId, email }` (no role), so when the request user
 * has no `role` we load it from the database via PrismaService. When `role` is
 * already present on `req.user` (e.g. in unit tests) we use it directly, so the
 * guard can be constructed with no dependencies.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly jwt?: JwtService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Admin role required');
    }

    let role: string | undefined = user.role;
    if (role === undefined && this.prisma) {
      const id = user.userId ?? user.id;
      if (id) {
        const found = await this.prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        role = found?.role;
        // Cache the role on the request for downstream handlers.
        req.user.role = role;
      }
    }

    if (role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
    await this.assertAdminSession(req, user);
    return true;
  }

  private async assertAdminSession(req: any, user: any): Promise<void> {
    if (!this.jwt || !this.config) return;

    const raw = req.headers?.['x-admin-session'];
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (!header) {
      throw new UnauthorizedException('Missing admin session');
    }

    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : header;
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid admin session');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        purpose?: string;
      }>(token, {
        secret:
          this.config.get<string>('ADMIN_JWT_SECRET') ??
          this.config.get<string>('JWT_SECRET'),
      });
      const userId = user.userId ?? user.id;
      if (
        payload.purpose !== 'admin' ||
        payload.sub !== userId ||
        payload.email !== user.email
      ) {
        throw new UnauthorizedException('Invalid admin session');
      }
    } catch {
      throw new UnauthorizedException('Invalid admin session');
    }
  }
}
