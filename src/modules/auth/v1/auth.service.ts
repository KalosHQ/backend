/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import { DeviceService } from 'src/modules/device/v1/device.service';
import { AuthLogService } from 'src/modules/logging/auth-log.service';
import {
  RegisterDto,
  RefreshTokenDto,
  SocialLoginDto,
  LogoutDto,
  VerifyOtpDto,
  SocialProvider,
} from './dto/auth.dto';
import { AppConfigService } from 'src/config/config.service';

type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly deviceService: DeviceService,
    private readonly authLogService: AuthLogService,
    private readonly config: AppConfigService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('email or phone is required');
    }

    const conflict = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (conflict) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await this.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        displayName: dto.displayName,
        passwordHash,
        isVerified: false,
      },
    });

    await this.authLogService.log({
      userId: user.id,
      identifier: dto.email ?? dto.phone ?? undefined,
      outcome: 'registration',
      ip,
      userAgent,
      deviceId: dto.deviceId,
    });

    const tokens = await this.issueTokens(user.id, dto.deviceId ?? 'unknown');
    return { user, ...tokens };
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
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.authLogService.log({
        userId: user.id,
        identifier,
        outcome: 'login_failure',
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(
    userId: string,
    deviceId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    await this.authLogService.log({
      userId,
      identifier: user.email ?? user.phone ?? undefined,
      outcome: 'login_success',
      deviceId,
      ip,
      userAgent,
    });
    const tokens = await this.issueTokens(userId, deviceId);
    return { user, ...tokens };
  }

  async socialLogin(dto: SocialLoginDto, ip?: string, userAgent?: string) {
    const { provider, socialId, email, displayName, deviceId } = dto;

    const providerKey =
      provider === SocialProvider.GOOGLE ? 'googleId' : 'facebookId';

    let user =
      (await this.prisma.user.findFirst({
        where: { [providerKey]: socialId },
      })) ??
      (email
        ? await this.prisma.user.findFirst({ where: { email } })
        : null);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName,
          isVerified: true,
          [providerKey]: socialId,
        },
      });
    } else if (!user[providerKey]) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { [providerKey]: socialId },
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
    return { user, ...tokens };
  }

  async refreshTokens(userId: string, dto: RefreshTokenDto) {
    const device = await this.deviceService.validateRefreshToken(
      userId,
      dto.deviceId,
    );
    if (!device || !device.refreshTokenHash) {
      await this.authLogService.log({
        userId,
        outcome: 'refresh_failure',
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const match = await bcrypt.compare(
      dto.refreshToken,
      device.refreshTokenHash,
    );
    if (!match) {
      await this.deviceService.revokeDevice(userId, dto.deviceId);
      await this.authLogService.log({
        userId,
        outcome: 'refresh_failure',
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(userId, dto.deviceId);
    await this.authLogService.log({
      userId,
      outcome: 'refresh_success',
      deviceId: dto.deviceId,
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

  async verifyOtp(userId: string, _dto: VerifyOtpDto) {
    // TODO: Placeholder for real OTP verification (Redis-backed)
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
    return { success: true };
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
}
