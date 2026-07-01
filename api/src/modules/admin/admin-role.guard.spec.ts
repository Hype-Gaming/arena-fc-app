import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

function ctxWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
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
});
