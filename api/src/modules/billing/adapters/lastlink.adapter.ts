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

  parse(_rawBody: Buffer): NormalizedWebhook {
    throw new Error('not implemented'); // implemented in Task 3
  }

  private headerValue(headers: Record<string, string>, name: string): string | undefined {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === name) return headers[key];
    }
    return undefined;
  }
}
