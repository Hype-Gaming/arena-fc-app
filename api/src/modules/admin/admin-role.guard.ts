import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
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
  constructor(@Optional() private readonly prisma?: PrismaService) {}

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
    return true;
  }
}
