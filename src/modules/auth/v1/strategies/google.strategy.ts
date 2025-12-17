/* eslint-disable @typescript-eslint/require-await */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: AppConfigService) {
    const clientID = config.getGoogleClientId();
    const clientSecret = config.getGoogleClientSecret();

    if (!clientID || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured');
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL: 'http://localhost:4000/v1/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    };

    super(options);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    return {
      providerId: profile.id,
      email,
      name: profile.displayName,
    };
  }
}
