/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import {
  AdminDecisionDto,
  VerificationIdParamDto,
} from './dto/verification.dto';
import { JwtAuthGuard } from 'src/modules/auth/v1/guards/jwt-auth.guard';
import { RoleGuard, Roles } from 'src/modules/auth/v1/guards/role.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/modules/auth/v1/decorators/current-user.decorator';

@ApiTags('Admin - Verification')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/verification', version: '1' })
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(Role.ADMIN)
export class AdminVerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Get all pending verification requests (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of pending verification requests. Private attachment paths include a presigned `url` field.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          type: { type: 'string', enum: ['CREATOR', 'VENDOR'] },
          status: { type: 'string', example: 'PENDING' },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async pending() {
    return this.service.listPending();
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve verification request (Admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({
    status: 200,
    description:
      'Verification request approved. Private attachment paths include a presigned `url` field.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async approve(
    @Param() params: VerificationIdParamDto,
    @Body() body: AdminDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.approve(params.id, user.sub, body.reviewNotes);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject verification request (Admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({
    status: 200,
    description:
      'Verification request rejected. Private attachment paths include a presigned `url` field.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async reject(
    @Param() params: VerificationIdParamDto,
    @Body() body: AdminDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.reject(params.id, user.sub, body.reviewNotes);
  }
}
