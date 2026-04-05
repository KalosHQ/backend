import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModelGenerationStatus, Role } from '@prisma/client';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

export class StyleResponseDto {
  @ApiProperty({ example: 'style_123' })
  id!: string;

  @ApiProperty({ example: 'casual' })
  name!: string;

  @ApiPropertyOptional({ example: 'Relaxed everyday aesthetic' })
  description?: string | null;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  updatedAt!: string;
}

export class UserStylePreferenceResponseDto {
  @ApiProperty({ example: 'pref_123' })
  id!: string;

  @ApiProperty({ example: 'user_123' })
  userId!: string;

  @ApiProperty({ example: 'style_123' })
  styleId!: string;

  @ApiPropertyOptional({ example: 0.8 })
  score?: number | null;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: StyleResponseDto })
  style!: StyleResponseDto;
}

export class AuthUserResponseDto {
  @ApiProperty({ example: 'user_123' })
  id!: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.kalos.app/profile/user_123.jpg',
    nullable: true,
  })
  profilePicture?: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiPropertyOptional({
    example: 'device-uuid-123',
    nullable: true,
  })
  deviceId?: string | null;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ example: false })
  wardrobeUploaded!: boolean;

  @ApiPropertyOptional({
    example: '2026-03-08T22:00:00.000Z',
    nullable: true,
  })
  onboardingCompletedAt?: string | null;

  @ApiProperty({
    enum: ModelGenerationStatus,
    example: ModelGenerationStatus.NOT_STARTED,
  })
  modelGenerationStatus!: ModelGenerationStatus;

  @ApiPropertyOptional({ example: '2026-03-08T22:00:00.000Z' })
  lastLoginAt?: string | null;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: 'google-oauth-id', nullable: true })
  googleId?: string | null;

  @ApiPropertyOptional({ example: 'facebook-oauth-id', nullable: true })
  facebookId?: string | null;
}

export class AuthenticatedUserDetailsResponseDto extends AuthUserResponseDto {
  @ApiProperty({ type: [UserStylePreferenceResponseDto] })
  stylePreferences!: UserStylePreferenceResponseDto[];
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}

export class RegistrationPendingResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({
    description: 'Indicates the user must verify OTP before login is allowed',
    example: true,
  })
  requiresOtpVerification!: boolean;

  @ApiProperty({
    description: 'OTP validity period in seconds',
    example: 600,
  })
  otpExpiresInSeconds!: number;

  @ApiProperty({
    description: 'Human readable registration state',
    example:
      'Registration successful. We sent a verification OTP to your email.',
  })
  message!: string;
}

export class RefreshAccessTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}

export class DeviceResponseDto {
  @ApiProperty({ example: 'device_record_123' })
  id!: string;

  @ApiProperty({ example: 'user_123' })
  userId!: string;

  @ApiProperty({ example: 'device-uuid-123' })
  deviceId!: string;

  @ApiPropertyOptional({
    description: 'Hashed refresh token associated with this device record',
    example: '$2b$10$examplehash',
    nullable: true,
  })
  refreshTokenHash?: string | null;

  @ApiPropertyOptional({
    example: '2026-03-08T22:00:00.000Z',
    nullable: true,
  })
  lastSeenAt?: string | null;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  createdAt!: string;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class OtpDeliveryResponseDto extends SuccessResponseDto {
  @ApiProperty({ example: 'OTP sent' })
  message!: string;

  @ApiProperty({ example: 600 })
  otpExpiresInSeconds!: number;
}

export class PasswordResetResponseDto extends SuccessResponseDto {
  @ApiProperty({ example: 'Password has been reset successfully' })
  message!: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'User phone number with country code',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'Display name for the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Unique device identifier for tracking user sessions',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description:
      'One-time init token from POST /v1/auth/register/init used to authorize this register attempt',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  initToken!: string;
}

export class LoginDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User phone number with country code',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'Unique device identifier for session tracking',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description:
      'One-time init token from POST /v1/auth/login/init used to authorize this login attempt',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  initToken!: string;
}

export class AuthInitRequestDto {
  @ApiPropertyOptional({
    description: 'Optional device identifier tied to the init token',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class AuthInitResponseDto {
  @ApiProperty({
    description:
      'Short-lived init token that must be sent in login/register request body',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'Flow this token can be used for',
    enum: ['login', 'register'],
    example: 'register',
  })
  @IsString()
  flow!: 'login' | 'register';

  @ApiProperty({
    description: 'Init token validity in seconds',
    example: 300,
  })
  expiresInSeconds!: number;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token to obtain new access token (optional when sent via refreshToken cookie)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description:
      'Device identifier associated with the refresh token (optional if encoded in refresh token)',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class LogoutDto {
  @ApiProperty({
    description: 'Device identifier to logout from',
    example: 'device-uuid-123',
  })
  @IsNotEmpty()
  @IsString()
  deviceId!: string;
}

export class LogoutDeviceDto {
  @ApiProperty({
    description: 'UUID of the device to logout',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  deviceId!: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'One-time password for verification',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  otp!: string;
}

export class VerifyOtpByEmailDto extends VerifyOtpDto {
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'Email address for OTP delivery',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address tied to the account',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto extends VerifyOtpDto {
  @ApiProperty({
    description: 'Email address tied to the account',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'New password',
    minLength: 8,
    example: 'EvenMoreSecure123!',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class SocialLoginDto {
  @ApiProperty({
    description: 'Social authentication provider',
    enum: SocialProvider,
    example: SocialProvider.GOOGLE,
  })
  @IsEnum(SocialProvider)
  provider!: SocialProvider;

  @ApiProperty({
    description: 'Unique user ID from the social provider',
    example: '1234567890',
  })
  @IsString()
  socialId!: string;

  @ApiPropertyOptional({
    description: 'Email address from social provider',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Display name from social provider',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'device-uuid-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
