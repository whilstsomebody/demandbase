import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AccessTokenPayload } from './jwt.strategy.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: AccessTokenPayload }>();
    const user = await this.prisma.user.findUnique({ where: { id: request.user.sub }, select: { isAdmin: true } });
    if (!user?.isAdmin) throw new ForbiddenException('Admin access required');
    return true;
  }
}
