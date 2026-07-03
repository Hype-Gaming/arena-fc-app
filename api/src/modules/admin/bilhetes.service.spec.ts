// api/src/modules/admin/bilhetes.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { AdminBilhetesService } from './bilhetes.service';
import { PrismaService } from '../../prisma/prisma.service';

function makePrisma(existing: Record<string, unknown> | null = null) {
  return {
    bilhete: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data })),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as PrismaService;
}

const CREATE = {
  categoria: 'safes' as const,
  homeTeam: 'Espanha',
  awayTeam: 'Áustria',
  startsAt: '2026-07-10T16:00:00.000Z',
  odd: 1.53,
};

describe('AdminBilhetesService', () => {
  it('create publishes immediately by default and parses startsAt', async () => {
    const prisma = makePrisma();
    const svc = new AdminBilhetesService(prisma);

    const created = await svc.create(CREATE);

    expect(created.publishedAt).toBeInstanceOf(Date);
    expect(created.startsAt).toEqual(new Date(CREATE.startsAt));
    const call = (prisma.bilhete.create as jest.Mock).mock.calls[0][0];
    expect(call.data.publish).toBeUndefined(); // flag must not leak to the row
  });

  it('create with publish=false stays a draft', async () => {
    const svc = new AdminBilhetesService(makePrisma());
    const created = await svc.create({ ...CREATE, publish: false });
    expect(created.publishedAt).toBeNull();
  });

  it('setPublished(false) unpublishes; re-publishing keeps the original stamp', async () => {
    const original = new Date('2026-07-01T00:00:00Z');
    const prisma = makePrisma({ id: 'b1', publishedAt: original });
    const svc = new AdminBilhetesService(prisma);

    await svc.setPublished('b1', false);
    expect((prisma.bilhete.update as jest.Mock).mock.calls[0][0].data).toEqual({
      publishedAt: null,
    });

    await svc.setPublished('b1', true);
    expect((prisma.bilhete.update as jest.Mock).mock.calls[1][0].data).toEqual({
      publishedAt: original,
    });
  });

  it('setResult updates the resultado', async () => {
    const prisma = makePrisma({ id: 'b1' });
    const svc = new AdminBilhetesService(prisma);
    await svc.setResult('b1', 'green');
    expect((prisma.bilhete.update as jest.Mock).mock.calls[0][0]).toMatchObject({
      where: { id: 'b1' },
      data: { resultado: 'green' },
    });
  });

  it('update/remove/setResult throw NotFound for unknown ids', async () => {
    const svc = new AdminBilhetesService(makePrisma(null));
    await expect(svc.update('nope', {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.setResult('nope', 'red')).rejects.toBeInstanceOf(NotFoundException);
  });
});
