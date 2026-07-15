// api/src/modules/billing/adapters/payment-provider.registry.spec.ts
import { NotFoundException } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { LastLinkAdapter } from './lastlink.adapter';
import { PaytAdapter } from './payt.adapter';

describe('PaymentProviderRegistry', () => {
  const lastlink = new LastLinkAdapter('s');
  const payt = new PaytAdapter('t');
  const registry = new PaymentProviderRegistry([lastlink, payt]);

  it('resolves a known provider by name', () => {
    expect(registry.get('lastlink')).toBe(lastlink);
    expect(registry.get('payt')).toBe(payt);
  });

  it('is case-insensitive', () => {
    expect(registry.get('LastLink')).toBe(lastlink);
  });

  it('throws NotFoundException for an unknown provider', () => {
    expect(() => registry.get('stripe')).toThrow(NotFoundException);
  });
});
