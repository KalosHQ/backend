import { Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { JobsService } from '../../jobs/v1/jobs.service';
import { JobTypeDto } from '../../jobs/v1/dto/jobs.dto';
import {
  AvatarExportFormat,
  GenerateAvatarDto,
} from './dto/avatar.dto';

@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async generateAvatar(userId: string, dto: GenerateAvatarDto) {
    const avatar = await this.prisma.avatar.create({
      data: {
        userId,
        status: JobStatus.PENDING,
        metadata: {
          source: 'avatar_endpoint',
          requested_input: {
            heightCm: dto.heightCm,
            weightKg: dto.weightKg,
            bodyType: dto.bodyType,
            gender: dto.gender,
            exportFormat: dto.exportFormat ?? AvatarExportFormat.GLB,
          },
        },
      },
    });

    const job = await this.jobsService.createJob(userId, {
      type: JobTypeDto.AVATAR_GENERATION,
      idempotencyKey: `avatar-generation-${avatar.id}`,
      priority: 80,
      input: {
        avatar_id: avatar.id,
        height_cm: dto.heightCm,
        weight_kg: dto.weightKg,
        body_type: dto.bodyType,
        gender: dto.gender,
        export_format: dto.exportFormat ?? AvatarExportFormat.GLB,
      },
      metadata: {
        source: 'avatar_endpoint',
        avatar_id: avatar.id,
      },
    });

    await this.prisma.avatar.update({
      where: { id: avatar.id },
      data: {
        sourceJobId: job.job_id,
      },
    });

    return {
      avatar_id: avatar.id,
      job_id: job.job_id,
      job_status: job.status,
    };
  }
}
