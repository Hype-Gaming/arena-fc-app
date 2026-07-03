// web/src/lib/checkout.ts — single source for LastLink checkout URLs.
const env = import.meta.env as Record<string, string | undefined>;

function nonEmpty(v: string | undefined): string | undefined {
  return v && v.trim() !== '' ? v : undefined;
}

/** Generic hosted checkout (pre-login CTA, fallback). */
export const CHECKOUT_URL =
  nonEmpty(env.VITE_CHECKOUT_URL) ?? 'https://lastlink.com';

/**
 * Each paid plan is its own LastLink product with its own hosted checkout.
 * Falls back to the generic checkout with a ?plano= hint while the per-plan
 * URLs are not configured (dev/demo).
 */
const CHECKOUT_BY_PLAN: Record<string, string | undefined> = {
  premium: nonEmpty(env.VITE_CHECKOUT_URL_PREMIUM),
  diamante: nonEmpty(env.VITE_CHECKOUT_URL_DIAMANTE),
};

export function checkoutUrlFor(planKey: string): string {
  return CHECKOUT_BY_PLAN[planKey] ?? `${CHECKOUT_URL}?plano=${planKey}`;
}
