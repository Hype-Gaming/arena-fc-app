// api/src/modules/billing/adapters/lastlink.adapter.spec.ts
import { createHmac } from 'crypto';
import { LastLinkAdapter } from './lastlink.adapter';

const SECRET = 'lastlink_test_secret';

function sign(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

describe('LastLinkAdapter.verifySignature', () => {
  const adapter = new LastLinkAdapter(SECRET);

  it('exposes provider name "lastlink"', () => {
    expect(adapter.name).toBe('lastlink');
  });

  it('returns true for a valid HMAC-SHA256 hex signature', () => {
    const body = Buffer.from('{"Id":"evt_1"}');
    expect(adapter.verifySignature(body, { 'x-lastlink-signature': sign(body) })).toBe(true);
  });

  it('is case-insensitive on the header name', () => {
    const body = Buffer.from('{"Id":"evt_2"}');
    expect(adapter.verifySignature(body, { 'X-Lastlink-Signature': sign(body) })).toBe(true);
  });

  it('returns false when the signature does not match the body', () => {
    const body = Buffer.from('{"Id":"evt_3"}');
    const tampered = Buffer.from('{"Id":"evt_3","amount":999}');
    expect(adapter.verifySignature(tampered, { 'x-lastlink-signature': sign(body) })).toBe(false);
  });

  it('returns false when the signature header is missing', () => {
    const body = Buffer.from('{"Id":"evt_4"}');
    expect(adapter.verifySignature(body, {})).toBe(false);
  });

  it('returns false for a malformed (non-hex / wrong-length) signature without throwing', () => {
    const body = Buffer.from('{"Id":"evt_5"}');
    expect(adapter.verifySignature(body, { 'x-lastlink-signature': 'not-a-hex' })).toBe(false);
  });
});

describe('LastLinkAdapter.parse', () => {
  const adapter = new LastLinkAdapter(SECRET);

  const payload = {
    Id: 'll_evt_42',
    Event: 'Purchase_Order_Confirmed',
    Data: {
      Buyer: { Email: 'Buyer@Example.com' },
      Products: [{ Id: 'll_prod_credits_100' }],
    },
  };

  it('normalizes a LastLink purchase payload', () => {
    const norm = adapter.parse(Buffer.from(JSON.stringify(payload)));
    expect(norm).toEqual({
      provider: 'lastlink',
      externalId: 'll_evt_42',
      type: 'Purchase_Order_Confirmed',
      buyerEmail: 'buyer@example.com',
      externalProductId: 'll_prod_credits_100',
      raw: payload,
    });
  });

  it('lowercases and trims the buyer email', () => {
    const p = { ...payload, Data: { ...payload.Data, Buyer: { Email: '  MIX@Case.COM ' } } };
    expect(adapter.parse(Buffer.from(JSON.stringify(p))).buyerEmail).toBe('mix@case.com');
  });

  it('throws on a body that is not valid JSON', () => {
    expect(() => adapter.parse(Buffer.from('<<<not json>>>'))).toThrow();
  });

  it('throws when required fields are missing', () => {
    expect(() => adapter.parse(Buffer.from(JSON.stringify({ Id: 'x' })))).toThrow(
      /missing/i,
    );
  });
});
