/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async setRefreshToken(
    userId: string,
    deviceId: string,
    refreshTokenHash: string,
  ) {
    await this.prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: { refreshTokenHash, lastSeenAt: new Date() },
      create: { userId, deviceId, refreshTokenHash, lastSeenAt: new Date() },
    });
  }

  async validateRefreshToken(
    userId: string,
    deviceId: string,
  ): Promise<{ refreshTokenHash: string } | null> {
    const device = await this.prisma.device.findFirst({
      where: { userId, deviceId },
      select: { refreshTokenHash: true },
    });
    if (!device || !device.refreshTokenHash) return null;
    return { refreshTokenHash: device.refreshTokenHash };
  }

  async revokeDevice(userId: string, deviceId: string) {
    await this.prisma.device.deleteMany({ where: { userId, deviceId } });
  }

  async list(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}
