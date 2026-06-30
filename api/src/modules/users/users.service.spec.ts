// api/src/modules/users/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService.findOrCreateByEmail', () => {
  function make(upsert: jest.Mock) {
    const prisma = { user: { upsert } };
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
});
