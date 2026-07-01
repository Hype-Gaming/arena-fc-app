import { NotFoundException } from '@nestjs/common';
import { EntradasService } from './entradas.service';

describe('EntradasService (CRUD)', () => {
  let prisma: any;
  let gamification: any;
  let service: EntradasService;

  beforeEach(() => {
    prisma = {
      entrada: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      entradaUnlock: { findMany: jest.fn() },
    };
    gamification = { handleEvent: jest.fn() };
    service = new EntradasService(prisma, gamification);
  });

  it('creates an entrada with status pending and coerced odd', async () => {
    const input = {
      matchId: 'm1',
      market: 'Resultado',
      selection: 'Casa',
      odd: 1.85,
      justification: 'porque sim',
      costInCredits: 2,
    };
    prisma.entrada.create.mockResolvedValue({ id: 'e1', ...input, status: 'pending' });
    const res = await service.create(input);
    expect(prisma.entrada.create).toHaveBeenCalledWith({
      data: { ...input, status: 'pending' },
    });
    expect(res.status).toBe('pending');
  });

  it('lists entradas by match', async () => {
    prisma.entrada.findMany.mockResolvedValue([{ id: 'e1' }]);
    const res = await service.findByMatch('m1');
    expect(prisma.entrada.findMany).toHaveBeenCalledWith({ where: { matchId: 'm1' } });
    expect(res).toEqual([{ id: 'e1' }]);
  });

  it('throws NotFound when updating a missing entrada', async () => {
    prisma.entrada.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { odd: 2 })).rejects.toThrow(NotFoundException);
  });

  it('deletes an entrada', async () => {
    prisma.entrada.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.entrada.delete.mockResolvedValue({ id: 'e1' });
    await service.remove('e1');
    expect(prisma.entrada.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });
});
