import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  SignupDto,
  LoginDto,
  SocialLoginDto,
  RefreshTokenDto,
  LogoutDto,
  LogoutDeviceDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthServiceV1 {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ----------------- SIGNUP -----------------
  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        displayName: dto.displayName,
        phone: dto.phone,
        deviceId: dto.deviceId,
        isVerified: false,
      },
    });

    const tokens = await this.generateTokens(user.id, dto.deviceId);
    return { user, ...tokens };
  }

  // ----------------- LOGIN -----------------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, dto.deviceId);
    await this.updateLastLogin(user.id);
    return { user, ...tokens };
  }

  // ----------------- SOCIAL LOGIN -----------------
  async socialLogin(dto: SocialLoginDto) {
    const providerIdField = `${dto.provider.toLowerCase()}Id`;
    let user = await this.prisma.user.findUnique({
      where: { [providerIdField]: dto.socialId },
    });

    if (!user) {
      const userData: Record<string, any> = {
        displayName: dto.displayName,
        email: dto.email,
        deviceId: dto.deviceId,
        [providerIdField]: dto.socialId,
      };
      user = await this.prisma.user.create({
        data: userData,
      });
    }

    const tokens = await this.generateTokens(user.id, dto.deviceId);
    await this.updateLastLogin(user.id);
    return { user, ...tokens };
  }

  // ----------------- REFRESH TOKEN -----------------
  async refreshToken(dto: RefreshTokenDto) {
    // Find user with matching refresh token hash and deviceId
    const user = await this.prisma.user.findFirst({
      where: {
        deviceId: dto.deviceId,
        refreshTokenHash: await this.hashToken(dto.refreshToken),
      },
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user.id, dto.deviceId);

    // Update hashed refresh token in DB (rotation)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await this.hashToken(tokens.refreshToken) },
    });

    return tokens;
  }

  // ----------------- LOGOUT -----------------
  async logout(userId: string, dto: LogoutDto) {
    await this.prisma.user.updateMany({
      where: { id: userId, deviceId: dto.deviceId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  // ----------------- LOGOUT SPECIFIC DEVICE -----------------
  async logoutDevice(userId: string, dto: LogoutDeviceDto) {
    await this.prisma.user.updateMany({
      where: { id: userId, deviceId: dto.deviceId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  // ----------------- FORGOT PASSWORD -----------------
  async forgotPassword(dto: ForgotPasswordDto) {
    let user;
    if (dto.email) {
      user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    } else if (dto.phone) {
      user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    }

    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOTP();
    // TODO: send OTP via SMS or email
    // save OTP to DB or cache (Redis) with expiration
    return { message: 'OTP sent', otp }; // remove otp in production, just for dev/testing
  }

  // ----------------- RESET PASSWORD -----------------
  async resetPassword(dto: ResetPasswordDto) {
    // TODO: validate OTP from DB/Redis
    const user = await this.prisma.user.findFirst({
      where: { deviceId: dto.deviceId },
    });
    if (!user) throw new UnauthorizedException('Invalid OTP or user');

    const hash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, refreshTokenHash: null }, // invalidate old tokens
    });

    return { success: true };
  }

  // ----------------- VERIFY OTP / EMAIL -----------------
  async verify(dto: VerifyDto, userId: string) {
    // TODO: check OTP validity
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
    return { success: true };
  }

  // ----------------- HELPER: GENERATE TOKENS -----------------
  private async generateTokens(userId: string, deviceId?: string) {
    const payload = { sub: userId, deviceId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // store hashed refresh token in DB for deviceId
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await this.hashToken(refreshToken), deviceId },
    });

    return { accessToken, refreshToken };
  }

  // ----------------- HELPER: HASH TOKEN -----------------
  private async hashToken(token: string) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(token, salt);
  }

  // ----------------- HELPER: UPDATE LAST LOGIN -----------------
  private async updateLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ----------------- HELPER: GENERATE OTP -----------------
  private generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }
}
