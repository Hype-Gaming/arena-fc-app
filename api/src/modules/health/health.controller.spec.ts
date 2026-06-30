// api/src/modules/health/health.controller.spec.ts
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = { check: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('GET /health delegates to HealthService.check', async () => {
    const payload = { status: 'ok', db: 'up', timestamp: '2026-06-30T00:00:00.000Z' };
    healthService.check.mockResolvedValue(payload);
    await expect(controller.health()).resolves.toEqual(payload);
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });
});
