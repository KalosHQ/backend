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
import {
  GenerateAvatarDto,
  GenerateAvatarResponseDto,
} from './dto/avatar.dto';
import { AvatarService } from './avatar.service';

@ApiTags('Avatar')
@Controller({ path: 'user', version: '1' })
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('avatar')
  @ApiOperation({
    summary: 'Create an avatar generation job for the authenticated user',
  })
  @ApiBody({ type: GenerateAvatarDto })
  @ApiResponse({
    status: 201,
    description: 'Avatar generation requested successfully',
    type: GenerateAvatarResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid avatar payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generateAvatar(
    @CurrentUser() user: { sub: string },
    @Body() body: GenerateAvatarDto,
  ) {
    return this.avatarService.generateAvatar(user.sub, body);
  }
}
