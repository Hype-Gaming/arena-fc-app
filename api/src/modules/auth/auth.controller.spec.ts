import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      refresh: jest.fn(),
      issueAdminSession: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      // Rate limiting is wired at the app level (ThrottlerModule); here we
      // exercise the controller in isolation, so stub the guard out.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(AuthController);
  });

  it('POST /auth/login delegates to AuthService.login', async () => {
    service.login.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' });
    const res = await controller.login({ email: 'a@b.com' });
    expect(service.login).toHaveBeenCalledWith('a@b.com');
    expect(res).toEqual({ accessToken: 'acc', refreshToken: 'ref' });
  });

  it('POST /auth/refresh delegates to AuthService.refresh', async () => {
    service.refresh.mockResolvedValue({
      accessToken: 'acc2',
      refreshToken: 'ref2',
    });
    const res = await controller.refresh({ refreshToken: 'ref' });
    expect(service.refresh).toHaveBeenCalledWith('ref');
    expect(res).toEqual({ accessToken: 'acc2', refreshToken: 'ref2' });
  });

  it('POST /auth/admin/session delegates to AuthService.issueAdminSession', async () => {
    service.issueAdminSession.mockResolvedValue({
      adminAccessToken: 'admin',
      expiresInSeconds: 1800,
    });

    const res = await controller.adminSession(
      { userId: 'u1', email: 'boss@arena.com' },
      { password: 's3cret-panel' },
    );

    expect(service.issueAdminSession).toHaveBeenCalledWith(
      'u1',
      'boss@arena.com',
      's3cret-panel',
    );
    expect(res).toEqual({ adminAccessToken: 'admin', expiresInSeconds: 1800 });
  });
});
