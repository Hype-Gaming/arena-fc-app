import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './jwt-auth.guard';

export function currentUserFactory(
  data: keyof AuthUser | undefined,
  ctx: ExecutionContext,
): AuthUser | string | undefined {
  const req = ctx.switchToHttp().getRequest();
  const user: AuthUser | undefined = req.user;
  if (!user) {
    return undefined;
  }
  return data ? user[data] : user;
}

export const CurrentUser = createParamDecorator(currentUserFactory);
