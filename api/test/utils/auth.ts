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
