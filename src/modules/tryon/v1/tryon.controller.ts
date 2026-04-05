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
import { TryOnDto, TryOnResponseDto } from './dto/tryon.dto';
import { TryOnService } from './tryon.service';

@ApiTags('TryOn')
@Controller({ path: 'try-on', version: '1' })
export class TryOnController {
  constructor(private readonly tryOnService: TryOnService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Create virtual try-on job and return job_id immediately',
  })
  @ApiBody({ type: TryOnDto })
  @ApiResponse({
    status: 201,
    description: 'Try-on job created',
    type: TryOnResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wardrobe item not found' })
  tryOn(@CurrentUser() user: { sub: string }, @Body() body: TryOnDto) {
    return this.tryOnService.tryOn(user.sub, body);
  }
}
