/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { DeviceService } from 'src/modules/device/v1/device.service';
import { AuthLogService } from 'src/modules/logging/auth-log.service';
import {
  RegisterDto,
  RefreshTokenDto,
  SocialLoginDto,
  LogoutDto,
  VerifyOtpByEmailDto,
  SocialProvider,
} from './dto/auth.dto';
import { AppConfigService } from 'src/config/config.service';
import { MailService } from 'src/modules/mail/mail.service';
import { OtpPurpose, OtpService } from 'src/modules/otp/v1/otp.service';

type TokenPair = { accessToken: string; refreshToken: string };
type AuthInitFlow = 'login' | 'register';
type PublicUser = Record<string, unknown>;

@Injectable()
export class AuthServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly deviceService: DeviceService,
    private readonly authLogService: AuthLogService,
    private readonly config: AppConfigService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
  ) {}

  createAuthInitToken(flow: AuthInitFlow, deviceId?: string) {
    const token = this.jwtService.sign(
      { flow, deviceId: deviceId ?? null, kind: 'auth-init' },
      {
        secret: this.config.getJwtAccessTokenSecret(),
        expiresIn: '5m',
      },
    );
    return { token, flow, expiresInSeconds: 300 };
  }

  validateAuthInitToken(
    initToken: string,
    expectedFlow: AuthInitFlow,
    deviceId?: string,
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(initToken, {
        secret: this.config.getJwtAccessTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired init token');
    }

    if (!payload || payload.kind !== 'auth-init') {
      throw new UnauthorizedException('Invalid init token');
    }

    if (payload.flow !== expectedFlow) {
      throw new UnauthorizedException('Init token does not match auth flow');
    }

    if (payload.deviceId && deviceId && payload.deviceId !== deviceId) {
      throw new UnauthorizedException(
        'Init token does not match the provided device',
      );
    }
  }

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    this.validateAuthInitToken(dto.initToken, 'register', dto.deviceId);

    if (!dto.email) {
      throw new BadRequestException(
        'email is required for OTP verification flow',
      );
    }

    let conflict: Awaited<ReturnType<typeof this.prisma.user.findFirst>>;
    try {
      conflict = await this.prisma.user.findFirst({
        where: {
          OR: [
            dto.email ? { email: dto.email } : undefined,
            dto.phone ? { phone: dto.phone } : undefined,
          ].filter(Boolean) as any,
        },
      });
    } catch (error) {
      this.throwIfSchemaDrift(error);
      throw error;
    }
    if (conflict) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.hash(dto.password);
    let user: Awaited<ReturnType<typeof this.prisma.user.create>>;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          displayName: dto.displayName,
          passwordHash,
          deviceId: dto.deviceId ?? null,
          isVerified: false,
        },
      });
    } catch (error) {
      this.throwIfSchemaDrift(error);
      throw error;
    }

    await this.authLogService.log({
      userId: user.id,
      identifier: dto.email ?? dto.phone ?? undefined,
      outcome: 'registration',
      ip,
      userAgent,
      deviceId: dto.deviceId,
    });

    const ttlSeconds = await this.sendVerificationOtp(user);
    return {
      user: this.toPublicUser(user),
      requiresOtpVerification: true,
      otpExpiresInSeconds: ttlSeconds,
      message:
        'Registration successful. We sent a verification OTP to your email.',
    };
  }

  async validateUser(identifier: string, password: string) {
    if (!identifier) {
      throw new BadRequestException('email or phone is required');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
    if (!user || !user.passwordHash) {
      throw new UnprocessableEntityException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.authLogService.log({
        userId: user.id,
        identifier,
        outcome: 'login_failure',
      });
      throw new UnprocessableEntityException('Invalid credentials');
    }

    if (!user.isVerified) {
      if (user.email) {
        try {
          await this.sendVerificationOtp(user);
        } catch {
          // Keep login denial deterministic even if OTP resend fails.
        }
      }
      await this.authLogService.log({
        userId: user.id,
        identifier,
        outcome: 'login_unverified',
      });
      throw new UnauthorizedException(
        'Account not verified. A new OTP has been sent to your email.',
      );
    }

    return user;
  }

  async login(
    userId: string,
    deviceId: string,
    initToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    this.validateAuthInitToken(initToken, 'login', deviceId);

    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) throw new UnauthorizedException();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), deviceId },
    });
    await this.authLogService.log({
      userId,
      identifier: existingUser.email ?? existingUser.phone ?? undefined,
      outcome: 'login_success',
      deviceId,
      ip,
      userAgent,
    });
    const tokens = await this.issueTokens(userId, deviceId);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async socialLogin(dto: SocialLoginDto, ip?: string, userAgent?: string) {
    const { provider, socialId, email, displayName, deviceId } = dto;

    const providerKey =
      provider === SocialProvider.GOOGLE ? 'googleId' : 'facebookId';

    let user =
      (await this.prisma.user.findFirst({
        where: { [providerKey]: socialId },
      })) ??
      (email ? await this.prisma.user.findFirst({ where: { email } }) : null);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName,
          deviceId: deviceId ?? 'social',
          isVerified: true,
          [providerKey]: socialId,
        },
      });
    } else if (!user[providerKey]) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { [providerKey]: socialId, deviceId: deviceId ?? 'social' },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { deviceId: deviceId ?? 'social' },
      });
    }

    await this.authLogService.log({
      userId: user.id,
      identifier: email ?? undefined,
      outcome: `${provider.toLowerCase()}_login`,
      deviceId: deviceId ?? 'social',
      ip,
      userAgent,
    });

    const tokens = await this.issueTokens(user.id, deviceId ?? 'social');
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refreshTokens(userId: string, dto: RefreshTokenDto) {
    if (!dto.deviceId || !dto.refreshToken) {
      throw new BadRequestException('refreshToken and deviceId are required');
    }

    const deviceId = dto.deviceId;
    const refreshToken = dto.refreshToken;

    const device = await this.deviceService.validateRefreshToken(
      userId,
      deviceId,
    );
    if (!device || !device.refreshTokenHash) {
      await this.authLogService.log({
        userId,
        outcome: 'refresh_failure',
        deviceId,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const match = await bcrypt.compare(
      refreshToken,
      device.refreshTokenHash,
    );
    if (!match) {
      await this.deviceService.revokeDevice(userId, deviceId);
      await this.authLogService.log({
        userId,
        outcome: 'refresh_failure',
        deviceId,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(userId, deviceId);
    await this.authLogService.log({
      userId,
      outcome: 'refresh_success',
      deviceId,
    });
    return tokens;
  }

  async logout(userId: string, dto: LogoutDto) {
    await this.deviceService.revokeDevice(userId, dto.deviceId);
    await this.authLogService.log({
      userId,
      deviceId: dto.deviceId,
      outcome: 'logout',
    });
    return { success: true };
  }

  async listDevices(userId: string) {
    return this.deviceService.list(userId);
  }

  async currentAuthenticatedUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stylePreferences: {
          include: {
            style: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toPublicUser(user);
  }

  async resendOtpByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    if (user.isVerified) {
      return { success: true, message: 'Account is already verified' };
    }

    const ttlSeconds = await this.sendVerificationOtp(user);
    return {
      success: true,
      message: 'OTP sent',
      otpExpiresInSeconds: ttlSeconds,
    };
  }

  async verifyOtpByEmail(dto: VerifyOtpByEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    const isValid = await this.otpService.verifyOtp(
      user.id,
      dto.otp,
      OtpPurpose.VERIFY_EMAIL,
    );
    if (!isValid) {
      throw new UnprocessableEntityException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    if (user.email) {
      this.mailService.queueRegistrationConfirmedEmail({
        to: user.email,
        displayName: user.displayName,
      });
    }

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    if (!user.email) {
      throw new BadRequestException('Cannot send OTP: user email is missing');
    }

    const { otp, ttlSeconds } = await this.otpService.generateAndStoreOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
    );

    await this.mailService.sendVerificationOtpEmail({
      to: user.email,
      otp,
      displayName: user.displayName,
      expiresInMinutes: Math.ceil(ttlSeconds / 60),
    });

    return {
      success: true,
      message: 'Password reset OTP sent',
      otpExpiresInSeconds: ttlSeconds,
    };
  }

  async confirmPasswordReset(params: {
    email: string;
    otp: string;
    newPassword: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: { email: params.email },
    });

    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    const isValid = await this.otpService.verifyOtp(
      user.id,
      params.otp,
      OtpPurpose.PASSWORD_RESET,
    );
    if (!isValid) {
      throw new UnprocessableEntityException('Invalid or expired OTP');
    }

    const passwordHash = await this.hash(params.newPassword);

    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        }),
        this.prisma.device.deleteMany({
          where: { userId: user.id },
        }),
      ]);
    } catch {
      throw new InternalServerErrorException(
        'Failed to reset password. Please try again.',
      );
    }

    await this.authLogService.log({
      userId: user.id,
      identifier: user.email ?? undefined,
      outcome: 'password_reset_success',
    });

    return { success: true, message: 'Password has been reset successfully' };
  }

  async ensureRole(userId: string, roles: Role[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return user;
  }

  private async issueTokens(
    userId: string,
    deviceId: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, deviceId };
    const accessOpts: any = {
      secret: this.config.getJwtAccessTokenSecret(),
      expiresIn: this.config.getJwtAccessExpiresIn(),
    };
    const refreshOpts: any = {
      secret: this.config.getJwtRefreshTokenSecret(),
      expiresIn: this.config.getJwtRefreshExpiresIn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const accessToken = this.jwtService.sign(payload, accessOpts);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const refreshToken = this.jwtService.sign(payload, refreshOpts);
    const refreshTokenHash = await this.hash(refreshToken);
    await this.deviceService.setRefreshToken(
      userId,
      deviceId,
      refreshTokenHash,
    );
    return { accessToken, refreshToken };
  }

  private hash(value: string) {
    const rounds = this.config.getBcryptSaltRounds();
    return bcrypt.hash(value, rounds);
  }

  private throwIfSchemaDrift(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    ) {
      throw new InternalServerErrorException(
        'Database schema is out of sync with the application. Run Prisma migrations and regenerate the client.',
      );
    }
  }

  private toPublicUser<T extends Record<string, unknown>>(user: T): PublicUser {
    const { passwordHash, refreshTokenHash, ...safe } = user as T & {
      passwordHash?: unknown;
      refreshTokenHash?: unknown;
    };
    return safe;
  }

  private async sendVerificationOtp(user: {
    id: string;
    email: string | null;
    displayName: string | null;
  }) {
    if (!user.email) {
      throw new BadRequestException('Cannot send OTP: user email is missing');
    }

    const { otp, ttlSeconds } = await this.otpService.generateAndStoreOtp(
      user.id,
      OtpPurpose.VERIFY_EMAIL,
    );

    await this.mailService.sendVerificationOtpEmail({
      to: user.email,
      otp,
      displayName: user.displayName,
      expiresInMinutes: Math.ceil(ttlSeconds / 60),
    });

    return ttlSeconds;
  }
}
