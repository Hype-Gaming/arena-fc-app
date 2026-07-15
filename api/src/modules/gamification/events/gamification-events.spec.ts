import {
  GAMIFICATION_EVENTS,
  GamificationEventName,
  GamificationEventPayload,
} from './gamification-events';

describe('gamification-events', () => {
  it('exposes the four MVP event names from spec section 6', () => {
    expect(GAMIFICATION_EVENTS).toEqual([
      'daily.login',
      'entrada.unlocked',
      'entrada.green',
      'referral',
    ]);
  });

  it('payload always carries a userId and an eventName', () => {
    const name: GamificationEventName = 'entrada.unlocked';
    const payload: GamificationEventPayload = {
      eventName: name,
      userId: 'user-1',
      entradaId: 'entrada-1',
    };
    expect(payload.userId).toBe('user-1');
    expect(payload.eventName).toBe('entrada.unlocked');
  });
});
