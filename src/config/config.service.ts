/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: NestConfigService) {}

  get(key: string) {
    return this.config.get(key);
  }

  getNodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  getCookieSecret(): string {
    return (
      this.config.get<string>('COOKIE_SECRET') ||
      this.config.get<string>('COOKIE_SEED') ||
      'kalos-cookie-secret'
    );
  }

  getPort(): number {
    return Number(this.config.get<number>('PORT') ?? 3000);
  }

  getJwtAccessTokenSecret(): string {
    return (
      this.config.get<string>('JWT_ACCESS_TOKEN_SECRET') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'kalos-access-secret'
    );
  }

  getJwtAccessExpiresIn(): string {
    return (
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      this.config.get<string>('JWT_EXPIRES_IN') ||
      '15m'
    );
  }

  getJwtRefreshTokenSecret(): string {
    return (
      this.config.get<string>('JWT_REFRESH_TOKEN_SECRET') ||
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_REFRESH_TOKEN_SECRET') ||
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_REFRESH') ||
      'kalos-refresh-secret'
    );
  }

  getJwtRefreshExpiresIn(): string {
    return (
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ||
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') ||
      '30d'
    );
  }

  getBcryptSaltRounds(): number {
    return Number(this.config.get<number>('BCRYPT_SALT_ROUNDS') ?? 10);
  }

  getDatabaseUrl(): string | undefined {
    return this.config.get<string>('DATABASE_URL');
  }

  getEmailHost(): string | undefined {
    return this.config.get<string>('EMAIL_HOST');
  }

  getEmailPort(): number | undefined {
    const v = this.config.get<number>('EMAIL_PORT');
    return v ? Number(v) : undefined;
  }

  getEmailUser(): string | undefined {
    return this.config.get<string>('EMAIL_USER');
  }

  getEmailPass(): string | undefined {
    return this.config.get<string>('EMAIL_PASS');
  }

  getEmailFrom(): string | undefined {
    return this.config.get<string>('EMAIL_FROM');
  }

  getCookieSeed(): string | undefined {
    return this.config.get<string>('COOKIE_SEED');
  }

  getS3Bucket(): string {
    return this.config.get<string>('S3_BUCKET') ?? 'kalos-bucket';
  }

  getStorageProvider(): string {
    return this.config.get<string>('STORAGE_PROVIDER') ?? 's3';
  }

  getFacebookClientId(): string | undefined {
    return this.config.get<string>('FACEBOOK_CLIENT_ID');
  }

  getFacebookClientSecret(): string | undefined {
    return this.config.get<string>('FACEBOOK_CLIENT_SECRET');
  }

  getGoogleClientId(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_ID');
  }

  getGoogleClientSecret(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET');
  }
}
