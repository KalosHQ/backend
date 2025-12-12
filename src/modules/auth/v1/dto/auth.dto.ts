import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  IsUUID,
} from 'class-validator';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;

  @IsNotEmpty()
  @IsString()
  deviceId!: string;
}

export class LogoutDto {
  @IsNotEmpty()
  @IsString()
  deviceId!: string;
}

export class LogoutDeviceDto {
  @IsNotEmpty()
  @IsUUID()
  deviceId!: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  otp!: string;
}

export class SocialLoginDto {
  @IsEnum(SocialProvider)
  provider!: SocialProvider;

  @IsString()
  socialId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
