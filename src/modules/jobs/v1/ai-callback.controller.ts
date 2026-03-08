import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiJobCallbackDto } from './dto/jobs.dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller({ path: 'ai', version: '1' })
export class AiCallbackController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('job-complete')
  @ApiOperation({
    summary: 'AI worker callback endpoint for job completion/failure updates',
  })
  @ApiHeader({
    name: 'x-ai-token',
    required: false,
    description: 'Shared secret for AI callbacks (if configured)',
  })
  @ApiResponse({ status: 201, description: 'Callback accepted' })
  aiJobComplete(
    @Headers('x-ai-token') token: string | undefined,
    @Body() body: AiJobCallbackDto,
  ) {
    return this.jobsService.handleAiCallback(body, token);
  }
}
