// api/src/modules/users/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService.findOrCreateByEmail', () => {
  function make(upsert: jest.Mock, findUnique = jest.fn()) {
    const prisma = { user: { upsert, findUnique } };
    return Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    })
      .compile()
      .then((m) => ({ service: m.get(UsersService), prisma }));
  }

  it('upserts the user by normalized email and returns the row', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { service } = await make(upsert);

    const user = await service.findOrCreateByEmail('  A@B.com ');

    expect(user).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(upsert).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      update: {},
      create: { email: 'a@b.com' },
    });
  });

  it('reuses the concurrently created user when upsert loses with P2002', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on email',
      { code: 'P2002', clientVersion: 'test', meta: { target: ['email'] } },
    );
    const upsert = jest.fn().mockRejectedValue(collision);
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'u1', email: 'buyer@example.com' });
    const { service } = await make(upsert, findUnique);

    await expect(
      service.findOrCreateByEmail(' Buyer@Example.com '),
    ).resolves.toEqual({ id: 'u1', email: 'buyer@example.com' });
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'buyer@example.com' },
    });
  });

  it('rethrows P2002 when no concurrent user can be found', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on email',
      { code: 'P2002', clientVersion: 'test' },
    );
    const { service } = await make(
      jest.fn().mockRejectedValue(collision),
      jest.fn().mockResolvedValue(null),
    );

    await expect(service.findOrCreateByEmail('buyer@example.com')).rejects.toBe(
      collision,
    );
  });
});
