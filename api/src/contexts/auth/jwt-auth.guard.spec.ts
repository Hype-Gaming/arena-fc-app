import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function ctxWithAuthHeader(header?: string): ExecutionContext {
  const req: any = { headers: header ? { authorization: header } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: any;
  let config: any;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    config = { get: jest.fn().mockReturnValue('test-secret') };
    guard = new JwtAuthGuard(jwt, config);
  });

  it('throws when no Authorization header is present', async () => {
    await expect(guard.canActivate(ctxWithAuthHeader())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the header is not a Bearer token', async () => {
    await expect(
      guard.canActivate(ctxWithAuthHeader('Basic abc')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when the token fails verification', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad sig'));
    await expect(
      guard.canActivate(ctxWithAuthHeader('Bearer bad.token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the decoded user to the request and allows the call', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@b.com' });
    const ctx = ctxWithAuthHeader('Bearer good.token');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual({ userId: 'u1', email: 'a@b.com' });
    expect(jwt.verifyAsync).toHaveBeenCalledWith('good.token', {
      secret: 'test-secret',
    });
  });
});
