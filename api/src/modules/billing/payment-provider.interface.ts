// api/src/modules/billing/payment-provider.interface.ts
export type ProviderName = 'lastlink' | 'payt';

/** Provider-agnostic shape produced by every adapter's parse(). */
export interface NormalizedWebhook {
  provider: ProviderName;
  /** Gateway-unique event id used for dedupe (WebhookEvent.externalId). */
  externalId: string;
  /** Raw provider event name (e.g. "Purchase", "Subscription.renewed"). */
  type: string;
  /** Buyer email — identity used to match/create the User. */
  buyerEmail: string;
  /** Maps to Product.externalProductId for the same provider. */
  externalProductId: string;
  /** Original decoded payload, persisted as WebhookEvent.payload (jsonb). */
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  /**
   * True if the request signature/token is authentic. Never throws.
   * `query` carries the URL query params — some gateways (Payt postback) can
   * only pass a secret in the URL (?token=…), not a header.
   */
  verifySignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    query?: Record<string, string>,
  ): boolean;
  /** Decode the raw body into a NormalizedWebhook. Throws on malformed body. */
  parse(rawBody: Buffer): NormalizedWebhook;
}

export const PAYMENT_PROVIDERS = 'PAYMENT_PROVIDERS';
