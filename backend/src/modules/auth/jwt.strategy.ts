import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-only-change-me',
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Single choke point: every guarded route in the app goes through here, so a suspension
    // is enforced everywhere (direct requests, broadcast posts, offers, etc.) without needing
    // a separate check in each module.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isSuspended: true } });
    if (!user || user.isSuspended) {
      throw new UnauthorizedException('This account is suspended');
    }

    return payload;
  }
}
