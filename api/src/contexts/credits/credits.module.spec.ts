// api/src/modules/credits/credits.module.spec.ts
import { Test } from '@nestjs/testing';
import { CreditsModule } from './credits.module';
import { CreditsService } from './credits.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CreditsModule', () => {
  it('provides CreditsService with PrismaService injected', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CreditsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ creditTransaction: { findFirst: jest.fn() } })
      .compile();

    const service = moduleRef.get(CreditsService);
    expect(service).toBeInstanceOf(CreditsService);
  });
});
