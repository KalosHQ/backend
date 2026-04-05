import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/v1/decorators/current-user.decorator';
import {
  CreateJobDto,
  JobResponseDto,
  JobStatusResponseDto,
} from './dto/jobs.dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Create asynchronous AI job and enqueue for processing',
  })
  @ApiBody({ type: CreateJobDto })
  @ApiResponse({
    status: 201,
    type: JobResponseDto,
    description: 'Job accepted and queued. Returns job_id immediately.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 503,
    description: 'Queue unavailable. Please retry shortly.',
  })
  create(@CurrentUser() user: { sub: string }, @Body() body: CreateJobDto) {
    return this.jobsService.createJob(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({
    summary: 'Get current job status and result URL if completed',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, type: JobStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getStatus(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.jobsService.getJobStatus(user.sub, id);
  }
}
