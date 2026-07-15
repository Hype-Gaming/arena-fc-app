// api/src/modules/billing/adapters/lastlink.adapter.ts
import { createHmac, timingSafeEqual } from 'crypto';
import {
  NormalizedWebhook,
  PaymentProvider,
  ProviderName,
} from '../payment-provider.interface';

const SIGNATURE_HEADER = 'x-lastlink-signature';

export class LastLinkAdapter implements PaymentProvider {
  readonly name: ProviderName = 'lastlink';

  constructor(private readonly secret: string) {}

  verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    const provided = this.headerValue(headers, SIGNATURE_HEADER);
    if (!provided) return false;

    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');

    let providedBuf: Buffer;
    let expectedBuf: Buffer;
    try {
      providedBuf = Buffer.from(provided, 'hex');
      expectedBuf = Buffer.from(expected, 'hex');
    } catch {
      return false;
    }
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
  }

  parse(rawBody: Buffer): NormalizedWebhook {
    let data: any;
    try {
      data = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new Error('LastLink webhook: body is not valid JSON');
    }

    const externalId = data?.Id;
    const type = data?.Event;
    const buyerEmail = data?.Data?.Buyer?.Email;
    const externalProductId = data?.Data?.Products?.[0]?.Id;

    if (!externalId || !type || !buyerEmail || !externalProductId) {
      throw new Error('LastLink webhook: missing required fields');
    }

    return {
      provider: 'lastlink',
      externalId: String(externalId),
      type: String(type),
      buyerEmail: String(buyerEmail).trim().toLowerCase(),
      externalProductId: String(externalProductId),
      raw: data,
    };
  }

  private headerValue(headers: Record<string, string>, name: string): string | undefined {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === name) return headers[key];
    }
    return undefined;
  }
}
