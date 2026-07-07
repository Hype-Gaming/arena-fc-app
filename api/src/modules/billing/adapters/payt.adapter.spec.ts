// api/src/modules/billing/adapters/payt.adapter.spec.ts
import { PaytAdapter } from './payt.adapter';

const TOKEN = 'payt_shared_token';

describe('PaytAdapter', () => {
  const adapter = new PaytAdapter(TOKEN);

  it('exposes provider name "payt"', () => {
    expect(adapter.name).toBe('payt');
  });

  it('verifies a matching static token (case-insensitive header)', () => {
    expect(adapter.verifySignature(Buffer.from('{}'), { 'x-payt-token': TOKEN })).toBe(true);
    expect(adapter.verifySignature(Buffer.from('{}'), { 'X-Payt-Token': TOKEN })).toBe(true);
  });

  it('verifies a matching token from the URL query (postback has no header)', () => {
    expect(adapter.verifySignature(Buffer.from('{}'), {}, { token: TOKEN })).toBe(true);
    expect(adapter.verifySignature(Buffer.from('{}'), {}, { token: 'nope' })).toBe(false);
  });

  it('rejects a wrong or missing token', () => {
    expect(adapter.verifySignature(Buffer.from('{}'), { 'x-payt-token': 'nope' })).toBe(false);
    expect(adapter.verifySignature(Buffer.from('{}'), {})).toBe(false);
    expect(adapter.verifySignature(Buffer.from('{}'), {}, {})).toBe(false);
  });

  it('normalizes a Payt payload into the shared shape', () => {
    const payload = {
      transaction_id: 'payt_tx_7',
      status: 'paid',
      customer: { email: 'Pay@Buyer.com' },
      plan_code: 'payt_premium_monthly',
    };
    const norm = adapter.parse(Buffer.from(JSON.stringify(payload)));
    expect(norm).toEqual({
      provider: 'payt',
      externalId: 'payt_tx_7',
      type: 'paid',
      buyerEmail: 'pay@buyer.com',
      externalProductId: 'payt_premium_monthly',
      raw: payload,
    });
  });

  it('throws on missing required fields', () => {
    expect(() => adapter.parse(Buffer.from(JSON.stringify({ status: 'paid' })))).toThrow(
      /missing/i,
    );
  });
});
