/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
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
  VerifyOtpByEmailDto,
  ResendOtpDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  SocialProvider,
  AuthInitResponseDto,
  AuthInitRequestDto,
  AuthSessionResponseDto,
  RegistrationPendingResponseDto,
  RefreshAccessTokenResponseDto,
  SuccessResponseDto,
  OtpDeliveryResponseDto,
  PasswordResetResponseDto,
  AuthenticatedUserDetailsResponseDto,
  DeviceResponseDto,
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Register new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    description: 'User registered and verification OTP sent via email',
    type: RegistrationPendingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or missing register init token',
  })
  async register(
    @Body() body: RegisterDto,
    @Req() req: FastifyRequest,
  ) {
    return this.authService.register(
      body,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: AuthSessionResponseDto,
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing login init token',
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
  @ApiResponse({
    status: 200,
    description: 'Google OAuth completed successfully',
    type: AuthSessionResponseDto,
  })
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    type: RefreshAccessTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'refreshToken and deviceId are required (body or cookie/token payload)',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refresh(
    @CurrentUser() user: any,
    @Body() body: RefreshTokenDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken =
      body.refreshToken ??
      (req.cookies as Record<string, string> | undefined)?.refreshToken;
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
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user from a specific device session' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: 200,
    description: 'Logout completed successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({
    status: 200,
    description: 'Authenticated user details',
    type: AuthenticatedUserDetailsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: any) {
    return this.authService.currentAuthenticatedUser(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List authenticated user device sessions' })
  @ApiResponse({
    status: 200,
    description: 'Device sessions retrieved successfully',
    type: [DeviceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async devices(@CurrentUser() user: any) {
    return this.authService.listDevices(user.sub);
  }

  @Post('resend-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resend verification OTP to the account email',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP resent successfully',
    type: OtpDeliveryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found for provided email' })
  async resendOtp(@Body() body: ResendOtpDto) {
    return this.authService.resendOtpByEmail(body.email);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify one-time password and mark user as verified',
  })
  @ApiBody({ type: VerifyOtpByEmailDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found for provided email' })
  @ApiResponse({ status: 422, description: 'Invalid or expired OTP' })
  async verify(@Body() body: VerifyOtpByEmailDto) {
    return this.authService.verifyOtpByEmail(body);
  }

  @Post('password-reset/request')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Request password reset OTP by email',
  })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP sent successfully',
    type: OtpDeliveryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found for provided email' })
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm password reset using OTP and set new password',
  })
  @ApiBody({ type: ConfirmPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset completed successfully',
    type: PasswordResetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found for provided email' })
  @ApiResponse({ status: 422, description: 'Invalid or expired OTP' })
  async confirmPasswordReset(@Body() body: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(body);
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
