import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from './jwt.strategy.js';

/** Use on a route guarded by JwtAuthGuard to get the authenticated user's id. */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user: AccessTokenPayload }>();
  return request.user.sub;
});
