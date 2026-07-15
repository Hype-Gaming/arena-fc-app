// api/src/modules/billing/dto/webhook-result.dto.ts
export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

export interface WebhookProcessResult {
  outcome: WebhookOutcome;
  /** WebhookEvent.id when persisted; undefined when verification rejected. */
  eventId?: string;
  /** Human-readable reason for "ignored" (e.g. "no matching product"). */
  reason?: string;
}
