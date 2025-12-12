/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { RequestVerificationDto } from './dto/verification.dto';
import { CurrentUser } from 'src/modules/auth/v1/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/v1/guards/jwt-auth.guard';

@Controller({ path: 'users/verify', version: '1' })
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('creator')
  async creator(
    @CurrentUser() user: any,
    @Body() body: RequestVerificationDto,
  ) {
    return this.service.requestVerification(
      user.sub,
      'CREATOR',
      body.payload,
      body.files,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('vendor')
  async vendor(@CurrentUser() user: any, @Body() body: RequestVerificationDto) {
    return this.service.requestVerification(
      user.sub,
      'VENDOR',
      body.payload,
      body.files,
    );
  }
}
