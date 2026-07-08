import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('AuthService.login', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  function build(admins?: string) {
    prisma = {
      user: { upsert: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    return Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: configWith({ JWT_SECRET: 'test-secret', ADMIN_EMAILS: admins }),
        },
      ],
    }).compile();
  }

  it('upserts the user by normalized email and issues a token pair', async () => {
    const moduleRef = await build();
    service = moduleRef.get(AuthService);
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    const result = await service.login('  A@B.com ');

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'a@b.com' } }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'u1', email: 'a@b.com' },
      expect.objectContaining({ expiresIn: '15m', secret: 'test-secret' }),
    );
    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.userId).toBe('u1');
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toMatch(/^[a-f0-9]{96}$/);
  });

  it('promotes the user to admin when the email is in ADMIN_EMAILS', async () => {
    const moduleRef = await build('boss@arena.com, chief@arena.com');
    service = moduleRef.get(AuthService);
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'boss@arena.com' });

    await service.login('Boss@Arena.com');

    const arg = prisma.user.upsert.mock.calls[0][0];
    expect(arg.create).toEqual(expect.objectContaining({ role: 'admin' }));
    expect(arg.update).toEqual(expect.objectContaining({ role: 'admin' }));
  });

  it('does not touch the role for a non-admin email', async () => {
    const moduleRef = await build('boss@arena.com');
    service = moduleRef.get(AuthService);
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    await service.login('a@b.com');

    const arg = prisma.user.upsert.mock.calls[0][0];
    expect(arg.create.role).toBeUndefined();
    expect(arg.update.role).toBeUndefined();
  });
});

describe('AuthService.refresh', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      refreshToken: {
        findFirst: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('new.access.jwt') },
        },
        {
          provide: ConfigService,
          useValue: configWith({ JWT_SECRET: 'test-secret' }),
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rejects an unknown or expired refresh token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    await expect(service.refresh('deadbeef')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deletes the old token and issues a new pair on rotation', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt1', userId: 'u1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    const result = await service.refresh('old-raw-token');

    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 'rt1' },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('new.access.jwt');
    expect(result.refreshToken).toMatch(/^[a-f0-9]{96}$/);
  });

  it('looks the token up by its sha256 hash, not the raw value', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt1', userId: 'u1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    await service.refresh('old-raw-token');

    const whereArg = prisma.refreshToken.findFirst.mock.calls[0][0].where;
    expect(whereArg.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(whereArg.tokenHash).not.toBe('old-raw-token');
  });
});
