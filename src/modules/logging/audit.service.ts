/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    adminId?: string;
    action: string;
    meta?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        adminId: params.adminId,
        action: params.action,
        meta: params.meta,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  }
}
