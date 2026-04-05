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
  AddWardrobeItemDto,
  AddWardrobeItemResponseDto,
} from './dto/wardrobe.dto';
import { WardrobeService } from './wardrobe.service';

@ApiTags('Wardrobe')
@Controller({ path: 'wardrobe', version: '1' })
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('add')
  @ApiOperation({
    summary:
      'Upload wardrobe item, store metadata, and enqueue clothing processing job',
  })
  @ApiBody({ type: AddWardrobeItemDto })
  @ApiResponse({
    status: 201,
    description: 'Wardrobe item accepted for processing',
    type: AddWardrobeItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addWardrobeItem(
    @CurrentUser() user: { sub: string },
    @Body() body: AddWardrobeItemDto,
  ) {
    return this.wardrobeService.addWardrobeItem(user.sub, body);
  }
}
