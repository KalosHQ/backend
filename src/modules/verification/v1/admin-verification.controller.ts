/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import {
  AdminDecisionDto,
  VerificationIdParamDto,
} from './dto/verification.dto';
import { JwtAuthGuard } from 'src/modules/auth/v1/guards/jwt-auth.guard';
import { RoleGuard, Roles } from 'src/modules/auth/v1/guards/role.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/modules/auth/v1/decorators/current-user.decorator';

@Controller({ path: 'admin/verification', version: '1' })
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(Role.ADMIN)
export class AdminVerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('pending')
  async pending() {
    return this.service.listPending();
  }

  @Post(':id/approve')
  async approve(
    @Param() params: VerificationIdParamDto,
    @Body() body: AdminDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.approve(params.id, user.sub, body.reviewNotes);
  }

  @Post(':id/reject')
  async reject(
    @Param() params: VerificationIdParamDto,
    @Body() body: AdminDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.reject(params.id, user.sub, body.reviewNotes);
  }
}
