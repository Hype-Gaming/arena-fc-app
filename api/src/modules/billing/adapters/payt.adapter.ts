// api/src/modules/billing/adapters/payt.adapter.ts
import { timingSafeEqual } from 'crypto';
import {
  NormalizedWebhook,
  PaymentProvider,
  ProviderName,
} from '../payment-provider.interface';

const TOKEN_HEADER = 'x-payt-token';

export class PaytAdapter implements PaymentProvider {
  readonly name: ProviderName = 'payt';

  constructor(private readonly token: string) {}

  verifySignature(_rawBody: Buffer, headers: Record<string, string>): boolean {
    const provided = this.headerValue(headers, TOKEN_HEADER);
    if (!provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(this.token);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  parse(rawBody: Buffer): NormalizedWebhook {
    let data: any;
    try {
      data = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new Error('Payt webhook: body is not valid JSON');
    }

    const externalId = data?.transaction_id;
    const type = data?.status;
    const buyerEmail = data?.customer?.email;
    const externalProductId = data?.plan_code;

    if (!externalId || !type || !buyerEmail || !externalProductId) {
      throw new Error('Payt webhook: missing required fields');
    }

    return {
      provider: 'payt',
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
