// api/src/modules/billing/adapters/payment-provider.registry.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PAYMENT_PROVIDERS, PaymentProvider } from '../payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly byName: Map<string, PaymentProvider>;

  constructor(@Inject(PAYMENT_PROVIDERS) providers: PaymentProvider[]) {
    this.byName = new Map(providers.map((p) => [p.name.toLowerCase(), p]));
  }

  get(provider: string): PaymentProvider {
    const found = this.byName.get(provider.toLowerCase());
    if (!found) {
      throw new NotFoundException(`Unknown payment provider: ${provider}`);
    }
    return found;
  }
}
