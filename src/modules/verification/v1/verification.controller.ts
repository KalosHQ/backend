/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import {
  RequestVerificationDto,
  VerificationRequestResponseDto,
} from './dto/verification.dto';
import { CurrentUser } from 'src/modules/auth/v1/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/v1/guards/jwt-auth.guard';

@ApiTags('Verification')
@Controller({ path: 'users/verify', version: '1' })
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('creator')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request creator verification' })
  @ApiBody({ type: RequestVerificationDto })
  @ApiResponse({
    status: 201,
    description:
      'Verification request submitted. Attachment paths from private storage include a presigned `url` field.',
    type: VerificationRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Verification request already exists',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request vendor verification' })
  @ApiBody({ type: RequestVerificationDto })
  @ApiResponse({
    status: 201,
    description:
      'Verification request submitted. Attachment paths from private storage include a presigned `url` field.',
    type: VerificationRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Verification request already exists',
  })
  async vendor(@CurrentUser() user: any, @Body() body: RequestVerificationDto) {
    return this.service.requestVerification(
      user.sub,
      'VENDOR',
      body.payload,
      body.files,
    );
  }
}
