import { JwtService } from '@nestjs/jwt';

/**
 * Sign a short-lived access token for e2e tests that matches the shape the
 * real JwtAuthGuard verifies: `{ sub, email }` signed with `JWT_SECRET`.
 * The guard maps `sub` -> `req.user.userId`.
 */
export async function signTestAccess(
  userId: string,
  email = `${userId}@test.dev`,
): Promise<string> {
  const jwt = new JwtService();
  const secret = process.env.JWT_SECRET ?? 'test-secret';
  return jwt.signAsync(
    { sub: userId, email },
    { secret, expiresIn: '15m' },
  );
}

/**
 * Sign an admin-session token for e2e tests — the second factor the
 * AdminRoleGuard requires via the `X-Admin-Session` header. Matches what
 * AuthService.issueAdminSession produces: `{ sub, email, purpose: 'admin' }`
 * signed with ADMIN_JWT_SECRET (falling back to JWT_SECRET).
 */
export async function signTestAdminSession(
  userId: string,
  email = `${userId}@test.dev`,
): Promise<string> {
  const jwt = new JwtService();
  const secret =
    process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'test-secret';
  return jwt.signAsync(
    { sub: userId, email, purpose: 'admin' },
    { secret, expiresIn: '30m' },
  );
}
