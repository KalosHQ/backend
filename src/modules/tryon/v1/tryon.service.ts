import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { JobsService } from '../../jobs/v1/jobs.service';
import { JobTypeDto } from '../../jobs/v1/dto/jobs.dto';
import { TryOnDto } from './dto/tryon.dto';

@Injectable()
export class TryOnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async tryOn(userId: string, dto: TryOnDto) {
    const wardrobeItem = await this.prisma.wardrobeItem.findFirst({
      where: { id: dto.wardrobeItemId, userId },
    });
    if (!wardrobeItem) throw new NotFoundException('Wardrobe item not found');

    const avatar = dto.avatarId
      ? await this.prisma.avatar.findFirst({
          where: { id: dto.avatarId, userId },
        })
      : await this.prisma.avatar.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

    const outfit = await this.prisma.outfit.create({
      data: {
        userId,
        avatarId: avatar?.id,
        wardrobeItemId: wardrobeItem.id,
        status: JobStatus.PENDING,
      },
    });

    const job = await this.jobs.createJob(userId, {
      type: JobTypeDto.VIRTUAL_TRYON,
      idempotencyKey: `tryon-${outfit.id}-${Date.now()}`,
      priority: 90,
      input: {
        outfit_id: outfit.id,
        avatar_id: avatar?.id,
        wardrobe_item_id: wardrobeItem.id,
        avatar_path: avatar?.modelPath,
        garment_path: wardrobeItem.processedPath ?? wardrobeItem.originalPath,
      },
      metadata: {
        source: 'try_on',
        outfit_id: outfit.id,
        avatar_id: avatar?.id,
        wardrobe_item_id: wardrobeItem.id,
      },
    });

    await this.prisma.outfit.update({
      where: { id: outfit.id },
      data: { sourceJobId: job.job_id },
    });

    return {
      outfit_id: outfit.id,
      job_id: job.job_id,
      job_status: job.status,
    };
  }
}
