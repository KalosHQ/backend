import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JobsService } from '../../jobs/v1/jobs.service';
import { JobTypeDto } from '../../jobs/v1/dto/jobs.dto';
import { AskStylistDto } from './dto/stylist.dto';

@Injectable()
export class StylistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async askStylist(userId: string, dto: AskStylistDto) {
    const wardrobeItems = await this.prisma.wardrobeItem.findMany({
      where: { userId },
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        color: true,
        metadata: true,
      },
    });

    const job = await this.jobs.createJob(userId, {
      type: JobTypeDto.STYLIST_RECOMMENDATION,
      idempotencyKey: `stylist-${Date.now()}`,
      priority: 60,
      input: {
        prompt: dto.prompt,
        context: dto.context,
        wardrobe_items: wardrobeItems,
      },
      metadata: {
        source: 'stylist_ask',
        wardrobe_item_count: wardrobeItems.length,
      },
    });

    return {
      job_id: job.job_id,
      job_status: job.status,
      message: 'Stylist request accepted. Poll /v1/jobs/:id for result.',
    };
  }
}
