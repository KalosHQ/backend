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
import { AskStylistDto, AskStylistResponseDto } from './dto/stylist.dto';
import { StylistService } from './stylist.service';

@ApiTags('Stylist')
@Controller({ path: 'stylist', version: '1' })
export class StylistController {
  constructor(private readonly stylistService: StylistService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('ask')
  @ApiOperation({
    summary: 'Enqueue AI stylist recommendation request and return job id',
  })
  @ApiBody({ type: AskStylistDto })
  @ApiResponse({
    status: 201,
    description: 'Stylist job created',
    type: AskStylistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  askStylist(
    @CurrentUser() user: { sub: string },
    @Body() body: AskStylistDto,
  ) {
    return this.stylistService.askStylist(user.sub, body);
  }
}
