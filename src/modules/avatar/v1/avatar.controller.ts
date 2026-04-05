import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/v1/decorators/current-user.decorator';
import { UsersService } from '../../users/v1/users.service';
import {
  OnboardingSubmissionResponseDto,
  SetModelCustomizationDto,
} from '../../users/v1/dto/onboarding.dto';

@ApiTags('Avatar')
@Controller({ path: 'user', version: '1' })
export class AvatarController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('avatar')
  @ApiOperation({
    summary:
      'Avatar generation entrypoint (alias of onboarding model customization)',
  })
  @ApiBody({ type: SetModelCustomizationDto })
  @ApiResponse({
    status: 201,
    description: 'Avatar generation requested successfully',
    type: OnboardingSubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid onboarding payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createAvatar(
    @CurrentUser() user: { sub: string },
    @Body() body: SetModelCustomizationDto,
  ) {
    return this.usersService.setModelCustomization(user.sub, body);
  }
}
