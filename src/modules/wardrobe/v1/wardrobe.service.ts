import { Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { JobsService } from '../../jobs/v1/jobs.service';
import { JobTypeDto } from '../../jobs/v1/dto/jobs.dto';
import { AddWardrobeItemDto } from './dto/wardrobe.dto';

@Injectable()
export class WardrobeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
  ) {}

  async addWardrobeItem(userId: string, dto: AddWardrobeItemDto) {
    const rawBase64 = this.stripDataUrlPrefix(dto.fileBase64);
    const buffer = Buffer.from(rawBase64, 'base64');
    const key = `wardrobe/raw/${userId}/${Date.now()}-${dto.filename}`;
    const uploaded = await this.storage.uploadFile({
      buffer,
      filename: dto.filename,
      key,
    });

    const item = await this.prisma.wardrobeItem.create({
      data: {
        userId,
        originalPath: uploaded.path,
        category: dto.category,
        color: dto.color,
        status: JobStatus.PENDING,
      },
    });

    const job = await this.jobs.createJob(userId, {
      type: JobTypeDto.CLOTHING_PROCESSING,
      idempotencyKey: `wardrobe-${item.id}-${Date.now()}`,
      priority: 70,
      input: {
        wardrobe_item_id: item.id,
        image_path: uploaded.path,
      },
      metadata: {
        source: 'wardrobe_add',
        wardrobe_item_id: item.id,
      },
    });

    await this.prisma.wardrobeItem.update({
      where: { id: item.id },
      data: { sourceJobId: job.job_id },
    });

    return {
      wardrobe_item_id: item.id,
      original_path: item.originalPath,
      original_url: await this.storage.resolvePrivateFileUrl(item.originalPath),
      job_id: job.job_id,
      job_status: job.status,
    };
  }

  private stripDataUrlPrefix(value: string): string {
    const marker = 'base64,';
    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) {
      return value;
    }
    return value.slice(markerIndex + marker.length);
  }
}
