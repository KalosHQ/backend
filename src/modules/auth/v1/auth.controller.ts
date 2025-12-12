/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  LogoutDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { AuthServiceV1 } from './auth.service';
import { AppConfigService } from 'src/config/config.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller({ path: 'auth', version: '1' })
export class AuthControllerV1 {
  constructor(
    private readonly authService: AuthServiceV1,
    private readonly config: AppConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.register(
      body,
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: any,
    @Body() body: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(
      user.id as string,
      body.deviceId ?? 'unknown',
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('social-login')
  socialLogin() {
    // TODO: Implement social login (Google/Facebook OAuth)
    // Parameters: body: SocialLoginDto, req: FastifyRequest, res: FastifyReply
    throw new Error('Social login not yet implemented');
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @CurrentUser() user: any,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tokens = await this.authService.refreshTokens(user.sub, body);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Body() body: LogoutDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logout(user.sub, body);
    res.clearCookie('refreshToken');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async devices(@CurrentUser() user: any) {
    return this.authService.listDevices(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  async verify(@CurrentUser() user: any, @Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(user.sub, body);
  }

  private setRefreshCookie(res: FastifyReply, token: string) {
    res.setCookie('refreshToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.getNodeEnv() === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
