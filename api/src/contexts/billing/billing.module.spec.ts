// api/src/modules/billing/billing.module.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from './billing.module';
import { BillingController } from './billing.controller';
import { PaymentProviderRegistry } from './adapters/payment-provider.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';

describe('BillingModule wiring', () => {
  it('resolves the controller and a registry with both adapters', async () => {
    process.env.LASTLINK_WEBHOOK_SECRET = 's';
    process.env.PAYT_WEBHOOK_TOKEN = 't';

    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), BillingModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(CreditsService)
      .useValue({})
      .overrideProvider(UsersService)
      .useValue({})
      .compile();

    expect(mod.get(BillingController)).toBeInstanceOf(BillingController);
    const registry = mod.get(PaymentProviderRegistry);
    expect(registry.get('lastlink').name).toBe('lastlink');
    expect(registry.get('payt').name).toBe('payt');
  });
});
