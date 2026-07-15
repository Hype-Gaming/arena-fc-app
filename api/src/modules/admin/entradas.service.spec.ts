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

describe('EntradasService.setResult', () => {
  let prisma: any;
  let gamification: any;
  let service: EntradasService;

  beforeEach(() => {
    prisma = {
      entrada: { findUnique: jest.fn(), update: jest.fn() },
      entradaUnlock: { findMany: jest.fn() },
    };
    gamification = { handleEvent: jest.fn().mockResolvedValue(undefined) };
    service = new EntradasService(prisma, gamification);
  });

  it('rejects an invalid result value', async () => {
    prisma.entrada.findUnique.mockResolvedValue({ id: 'e1', status: 'pending' });
    await expect(service.setResult('e1', 'maybe' as any)).rejects.toThrow(/green|red/);
  });

  it('throws NotFound for a missing entrada', async () => {
    prisma.entrada.findUnique.mockResolvedValue(null);
    await expect(service.setResult('nope', 'green')).rejects.toThrow('Entrada not found');
  });

  it('marks green and emits entrada.green for each user who unlocked it', async () => {
    prisma.entrada.findUnique.mockResolvedValue({ id: 'e1', status: 'pending' });
    prisma.entrada.update.mockResolvedValue({ id: 'e1', status: 'green' });
    prisma.entradaUnlock.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
    ]);

    const res = await service.setResult('e1', 'green');

    expect(prisma.entrada.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'green' },
    });
    // Uses the real GamificationEventPayload contract: { eventName, userId, entradaId }
    expect(gamification.handleEvent).toHaveBeenCalledTimes(2);
    expect(gamification.handleEvent).toHaveBeenCalledWith({
      eventName: 'entrada.green',
      userId: 'u1',
      entradaId: 'e1',
    });
    expect(gamification.handleEvent).toHaveBeenCalledWith({
      eventName: 'entrada.green',
      userId: 'u2',
      entradaId: 'e1',
    });
    expect(res.status).toBe('green');
  });

  it('marks red and emits no gamification events', async () => {
    prisma.entrada.findUnique.mockResolvedValue({ id: 'e1', status: 'pending' });
    prisma.entrada.update.mockResolvedValue({ id: 'e1', status: 'red' });
    prisma.entradaUnlock.findMany.mockResolvedValue([{ userId: 'u1' }]);

    await service.setResult('e1', 'red');

    expect(prisma.entrada.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'red' },
    });
    expect(gamification.handleEvent).not.toHaveBeenCalled();
  });
});
