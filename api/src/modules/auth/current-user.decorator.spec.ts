import { ExecutionContext } from '@nestjs/common';
import { currentUserFactory } from './current-user.decorator';

function ctxWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator factory', () => {
  it('returns the whole user object when no field is requested', () => {
    const user = { userId: 'u1', email: 'a@b.com' };
    expect(currentUserFactory(undefined, ctxWithUser(user))).toEqual(user);
  });

  it('returns a single field when requested', () => {
    const user = { userId: 'u1', email: 'a@b.com' };
    expect(currentUserFactory('userId', ctxWithUser(user))).toBe('u1');
  });

  it('returns undefined when there is no user on the request', () => {
    expect(currentUserFactory(undefined, ctxWithUser(undefined))).toBeUndefined();
  });
});
