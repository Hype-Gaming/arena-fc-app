import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MAIL_SERVICE, MailService } from './mail/mail.service';

describe('AuthService.requestCode', () => {
  let service: AuthService;
  let prisma: any;
  let mail: jest.Mocked<MailService>;

  beforeEach(async () => {
    prisma = {
      user: { upsert: jest.fn() },
      authCode: { create: jest.fn() },
    };
    mail = { sendOtp: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MAIL_SERVICE, useValue: mail },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('upserts the user by email, stores a 6-digit code and emails it', async () => {
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    prisma.authCode.create.mockResolvedValue({});

    const result = await service.requestCode('A@B.com');

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'a@b.com' } }),
    );
    expect(prisma.authCode.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.authCode.create.mock.calls[0][0];
    expect(createArg.data.userId).toBe('u1');
    expect(createArg.data.code).toMatch(/^\d{6}$/);
    expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mail.sendOtp).toHaveBeenCalledWith('a@b.com', createArg.data.code);
    expect(result).toEqual({ ok: true });
  });
});
