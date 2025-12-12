/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthServiceV1 } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthServiceV1) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: any, username: string, password: string) {
    const identifier = username || req.body.phone;
    const user = await this.authService.validateUser(identifier, password);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
