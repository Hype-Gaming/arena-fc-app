import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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

describe('AuthService.verify', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      authCode: { findFirst: jest.fn(), update: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MAIL_SERVICE, useValue: { sendOtp: jest.fn() } },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rejects an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.verify('x@y.com', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when no matching unused/unexpired code exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    prisma.authCode.findFirst.mockResolvedValue(null);
    await expect(service.verify('a@b.com', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('marks code used, signs an access JWT and stores a hashed refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    prisma.authCode.findFirst.mockResolvedValue({ id: 'c1' });

    const result = await service.verify('A@b.com', '123456');

    expect(prisma.authCode.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'u1', email: 'a@b.com' },
      expect.objectContaining({ expiresIn: '15m', secret: 'test-secret' }),
    );
    // refresh token stored as a hash, never in plaintext
    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.userId).toBe('u1');
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(result.refreshToken);
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toMatch(/^[a-f0-9]{96}$/);
  });
});
