/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
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
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  LogoutDto,
  VerifyOtpDto,
  SocialProvider,
  AuthInitResponseDto,
  AuthInitRequestDto,
} from './dto/auth.dto';
import { AuthServiceV1 } from './auth.service';
import { AppConfigService } from 'src/config/config.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthControllerV1 {
  constructor(
    private readonly authService: AuthServiceV1,
    private readonly config: AppConfigService,
  ) {}

  /* ===================== EMAIL / PASSWORD ===================== */

  @Post('register/init')
  @ApiOperation({
    summary:
      'Initialize register flow and return a short-lived token required by POST /v1/auth/register',
  })
  @ApiBody({ type: AuthInitRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Register init token created',
    type: AuthInitResponseDto,
  })
  registerInit(@Body() body: AuthInitRequestDto) {
    return this.authService.createAuthInitToken('register', body.deviceId);
  }

  @Post('login/init')
  @ApiOperation({
    summary:
      'Initialize login flow and return a short-lived token required by POST /v1/auth/login',
  })
  @ApiBody({ type: AuthInitRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Login init token created',
    type: AuthInitResponseDto,
  })
  loginInit(@Body() body: AuthInitRequestDto) {
    return this.authService.createAuthInitToken('login', body.deviceId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or missing register init token',
  })
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
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or invalid/missing login init token',
  })
  async login(
    @CurrentUser() user: any,
    @Body() body: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(
      user.id as string,
      body.deviceId ?? 'unknown',
      body.initToken,
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  /* ===================== GOOGLE OAUTH ===================== */

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Passport handles redirect
  }

  // @Get('google/callback')
  // @UseGuards(GoogleAuthGuard)
  // async googleCallback(
  //   @Req() req: FastifyRequest & { user?: any },
  //   @Res() res: FastifyReply,
  // ) {
  //   const googleUser = req.user;
  //   if (!googleUser) {
  //     throw new UnauthorizedException('Google user not found on request');
  //   }

  //   const result = await this.authService.socialLogin(
  //     {
  //       provider: SocialProvider.GOOGLE,
  //       socialId: googleUser.providerId,
  //       email: googleUser.email,
  //       displayName: googleUser.name,
  //       deviceId: 'google-oauth',
  //     },
  //     req.ip,
  //     req.headers['user-agent'],
  //   );

  //   this.setRefreshCookie(res, result.refreshToken);

  //   return res.redirect(
  //     `http://localhost:3000/auth/callback?accessToken=${result.accessToken}`,
  //   );
  // }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: FastifyRequest & { user?: any },
    @Res() res: FastifyReply,
  ) {
    const googleUser = req.user;

    const result = await this.authService.socialLogin(
      {
        provider: SocialProvider.GOOGLE,
        socialId: googleUser.providerId,
        email: googleUser.email,
        displayName: googleUser.name,
        deviceId: 'google-oauth',
      },
      req.ip,
      req.headers['user-agent'],
    );

    this.setRefreshCookie(res, result.refreshToken);

    return res.status(200).send({
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  /* ===================== TOKENS ===================== */

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @CurrentUser() user: any,
    @Body() body: RefreshTokenDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken =
      body.refreshToken ?? (req.cookies as Record<string, string> | undefined)?.refreshToken;
    const deviceId = body.deviceId ?? (user.deviceId as string | undefined);

    if (!refreshToken || !deviceId) {
      throw new BadRequestException(
        'refreshToken and deviceId are required (body or cookie/token payload)',
      );
    }

    const tokens = await this.authService.refreshTokens(user.sub, {
      refreshToken,
      deviceId,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
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
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Get current authenticated user with style preferences and related style details',
  })
  @ApiResponse({ status: 200, description: 'Authenticated user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: any) {
    return this.authService.currentAuthenticatedUser(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  @ApiBearerAuth('JWT-auth')
  async devices(@CurrentUser() user: any) {
    return this.authService.listDevices(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  @ApiBearerAuth('JWT-auth')
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
