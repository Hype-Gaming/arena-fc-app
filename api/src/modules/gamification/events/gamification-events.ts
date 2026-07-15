// Domain event contracts consumed by GamificationService (spec section 6).
// Other modules (tips, auth, referral) emit these via EventEmitter2.

export const GAMIFICATION_EVENTS = [
  'daily.login',
  'entrada.unlocked',
  'entrada.green',
  'referral',
] as const;

export type GamificationEventName = (typeof GAMIFICATION_EVENTS)[number];

export interface GamificationEventPayload {
  eventName: GamificationEventName;
  userId: string;
  /** Set for entrada.unlocked / entrada.green. */
  entradaId?: string;
  /** Set for referral: the user who was referred. */
  referredUserId?: string;
}
