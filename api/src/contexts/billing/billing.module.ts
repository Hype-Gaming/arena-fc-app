// api/src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CreditsModule } from '../credits/credits.module';
import { UsersModule } from '../users/users.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PaymentProviderRegistry } from './adapters/payment-provider.registry';
import { LastLinkAdapter } from './adapters/lastlink.adapter';
import { PaytAdapter } from './adapters/payt.adapter';
import {
  PAYMENT_PROVIDERS,
  PaymentProvider,
} from './payment-provider.interface';

@Module({
  imports: [ConfigModule, PrismaModule, CreditsModule, UsersModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    PaymentProviderRegistry,
    {
      provide: PAYMENT_PROVIDERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaymentProvider[] => [
        new LastLinkAdapter(config.getOrThrow<string>('LASTLINK_WEBHOOK_SECRET')),
        new PaytAdapter(config.getOrThrow<string>('PAYT_WEBHOOK_TOKEN')),
      ],
    },
  ],
})
export class BillingModule {}
