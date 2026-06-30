// api/src/modules/billing/payment-provider.interface.spec.ts
import {
  PaymentProvider,
  NormalizedWebhook,
  ProviderName,
} from './payment-provider.interface';

describe('PaymentProvider interface', () => {
  it('lets a class implement the contract with the expected method shapes', async () => {
    class FakeProvider implements PaymentProvider {
      readonly name: ProviderName = 'lastlink';
      verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean {
        return rawBody.length >= 0 && typeof headers === 'object';
      }
      parse(rawBody: Buffer): NormalizedWebhook {
        const data = JSON.parse(rawBody.toString('utf8'));
        return {
          provider: 'lastlink',
          externalId: data.id,
          type: data.event,
          buyerEmail: data.email,
          externalProductId: data.productId,
          raw: data,
        };
      }
    }

    const p = new FakeProvider();
    const body = Buffer.from(
      JSON.stringify({ id: 'evt_1', event: 'Purchase', email: 'a@b.com', productId: 'prod_1' }),
    );

    expect(p.name).toBe('lastlink');
    expect(p.verifySignature(body, { 'x-sig': 'z' })).toBe(true);

    const norm = p.parse(body);
    expect(norm).toEqual({
      provider: 'lastlink',
      externalId: 'evt_1',
      type: 'Purchase',
      buyerEmail: 'a@b.com',
      externalProductId: 'prod_1',
      raw: { id: 'evt_1', event: 'Purchase', email: 'a@b.com', productId: 'prod_1' },
    });
  });
});
