import { ForbiddenException, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

function ctxWithUser(user: unknown, headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, headers }) }),
  } as unknown as ExecutionContext;
}

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  it('allows a user with role=admin', async () => {
    expect(await guard.canActivate(ctxWithUser({ id: 'u1', role: 'admin' }))).toBe(true);
  });

  it('rejects a user with role=user', async () => {
    await expect(
      guard.canActivate(ctxWithUser({ id: 'u1', role: 'user' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when there is no user on the request', async () => {
    await expect(guard.canActivate(ctxWithUser(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('requires a separate admin session when jwt dependencies are available', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'u1',
        email: 'boss@arena.com',
        purpose: 'admin',
      }),
    };
    const config = { get: jest.fn((key: string) => (key === 'ADMIN_JWT_SECRET' ? 'admin-secret' : 'secret')) };
    const strictGuard = new AdminRoleGuard(undefined as never, jwt as never, config as never);

    await expect(
      strictGuard.canActivate(ctxWithUser({ id: 'u1', email: 'boss@arena.com', role: 'admin' })),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strictGuard.canActivate(
        ctxWithUser(
          { id: 'u1', email: 'boss@arena.com', role: 'admin' },
          { 'x-admin-session': 'Bearer admin.jwt' },
        ),
      ),
    ).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('admin.jwt', {
      secret: 'admin-secret',
    });
  });
});
