import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      refresh: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

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
});
