// api/src/prisma/prisma.service.spec.ts
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('extends PrismaClient', () => {
    const service = new PrismaService();
    expect(service).toBeInstanceOf(PrismaClient);
  });

  it('connects on module init and disconnects on destroy', async () => {
    const service = new PrismaService();
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);

    await service.onModuleInit();
    expect(connect).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
