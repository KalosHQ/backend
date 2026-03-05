/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly config: AppConfigService) {
    super({
      clientID: config.getFacebookClientId() || 'placeholder',
      clientSecret: config.getFacebookClientSecret() || 'placeholder',
      callbackURL: config.getFacebookCallbackUrl(),
      profileFields: ['id', 'displayName', 'emails'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    _profile: any,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    // TODO: Implement Facebook OAuth validation
    done(null, {});
  }
}
