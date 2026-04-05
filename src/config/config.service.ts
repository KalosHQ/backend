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

  getEmailFrom(): string | undefined {
    return this.config.get<string>('EMAIL_FROM');
  }

  getResendApiKey(): string | undefined {
    return this.config.get<string>('RESEND_API_KEY');
  }

  getCookieSeed(): string | undefined {
    return this.config.get<string>('COOKIE_SEED');
  }

  getS3Bucket(): string {
    return this.config.get<string>('S3_BUCKET') ?? 'kalos-bucket';
  }

  getS3PrivateBucket(): string {
    return (
      this.config.get<string>('S3_PRIVATE_BUCKET') ||
      this.config.get<string>('S3_BUCKET') ||
      'kalos-private-storage'
    );
  }

  getS3PublicBucket(): string {
    return (
      this.config.get<string>('S3_PUBLIC_BUCKET') ?? 'kalos-public-storage'
    );
  }

  getAwsRegion(): string {
    return this.config.get<string>('AWS_REGION') ?? 'us-east-1';
  }

  getAwsAccessKeyId(): string | undefined {
    return this.config.get<string>('AWS_ACCESS_KEY_ID');
  }

  getAwsSecretAccessKey(): string | undefined {
    return this.config.get<string>('AWS_SECRET_ACCESS_KEY');
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

  getGoogleCallbackUrl(): string {
    return (
      this.config.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:4000/v1/auth/google/callback'
    );
  }

  getFacebookCallbackUrl(): string {
    return (
      this.config.get<string>('FACEBOOK_CALLBACK_URL') ??
      'http://localhost:4000/v1/auth/facebook/callback'
    );
  }

  getAppUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:4000';
  }

  getRedisUrl(): string {
    return this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  }

  getOtpTtlSeconds(): number {
    return Number(this.config.get<number>('OTP_TTL_SECONDS') ?? 600);
  }

  getOtpLength(): number {
    return Number(this.config.get<number>('OTP_LENGTH') ?? 6);
  }

  getOtpResendCooldownSeconds(): number {
    return Number(
      this.config.get<number>('OTP_RESEND_COOLDOWN_SECONDS') ?? 60,
    );
  }

  getOtpMaxVerifyAttempts(): number {
    return Number(this.config.get<number>('OTP_MAX_VERIFY_ATTEMPTS') ?? 5);
  }

  getOtpMaxRequestsPerWindow(): number {
    return Number(this.config.get<number>('OTP_MAX_REQUESTS_PER_WINDOW') ?? 5);
  }

  getOtpRequestWindowSeconds(): number {
    return Number(
      this.config.get<number>('OTP_REQUEST_WINDOW_SECONDS') ?? 3600,
    );
  }

  getMailMaxRetries(): number {
    return Number(this.config.get<number>('MAIL_MAX_RETRIES') ?? 3);
  }

  getMailRetryDelayMs(): number {
    return Number(this.config.get<number>('MAIL_RETRY_DELAY_MS') ?? 300);
  }

  getAiWebhookToken(): string | undefined {
    return this.config.get<string>('AI_WEBHOOK_TOKEN');
  }
}
