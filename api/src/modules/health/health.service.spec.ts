// api/src/modules/health/health.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(HealthService);
    prisma.$queryRaw.mockReset();
  });

  it('reports ok with db up when query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(typeof result.timestamp).toBe('string');
  });

  it('reports degraded with db down when query throws', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const result = await service.check();
    expect(result.status).toBe('degraded');
    expect(result.db).toBe('down');
  });
});
