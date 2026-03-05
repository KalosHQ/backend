/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.refreshToken,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getJwtRefreshTokenSecret(),
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(req: any, payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();
    return { sub: user.id, deviceId: payload.deviceId };
  }
}
