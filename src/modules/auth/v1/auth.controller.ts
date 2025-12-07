import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDeviceDto,
  LogoutDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignupDto,
  SocialLoginDto,
  VerifyDto,
} from './dto/auth.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthControllerV1 {
  @Post('signup')
  async signup(@Body() body: SignupDto) {
    // handle email/password registration
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    // handle login
  }

  @Post('social-login')
  async socialLogin(@Body() body: SocialLoginDto) {
    // handle social OAuth login
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto, @Req() req: FastifyRequest) {
    // invalidate current device token
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: RefreshTokenDto) {
    // issue new access token (and optionally new refresh token)
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    // send OTP/email for password reset
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    // validate OTP/email and reset password
  }

  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    // verify email/phone OTP
  }

  @Get('devices')
  async listDevices(@Req() req: FastifyRequest) {
    // return active devices for this user
  }

  @Post('logout-device')
  async logoutDevice(@Body() body: LogoutDeviceDto) {
    // log out a specific device
  }
}
