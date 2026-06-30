import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    service = {
      requestCode: jest.fn(),
      verify: jest.fn(),
      refresh: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('POST /auth/request-code delegates to AuthService.requestCode', async () => {
    service.requestCode.mockResolvedValue({ ok: true });
    const res = await controller.requestCode({ email: 'a@b.com' });
    expect(service.requestCode).toHaveBeenCalledWith('a@b.com');
    expect(res).toEqual({ ok: true });
  });

  it('POST /auth/verify delegates to AuthService.verify', async () => {
    service.verify.mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const res = await controller.verify({ email: 'a@b.com', code: '123456' });
    expect(service.verify).toHaveBeenCalledWith('a@b.com', '123456');
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
