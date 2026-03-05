/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    identifier?: string;
    outcome: string;
    ip?: string;
    userAgent?: string;
    deviceId?: string;
  }) {
    await this.prisma.authLog.create({
      data: {
        userId: params.userId,
        identifier: params.identifier,
        outcome: params.outcome,
        ip: params.ip,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
      },
    });
  }
}
