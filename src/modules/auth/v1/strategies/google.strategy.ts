/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: AppConfigService) {
    super({
      clientID: config.getGoogleClientId() || 'placeholder',
      clientSecret: config.getGoogleClientSecret() || 'placeholder',
      callbackURL: '/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    _profile: any,
    done: VerifyCallback,
  ) {
    // TODO: Implement Google OAuth validation
    done(null, {});
  }
}
