import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  JobStatus,
  JobType,
  ModelGenerationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AppConfigService } from '../../../config/config.service';
import {
  AiJobCallbackDto,
  CreateJobDto,
  JobStatusDto,
  JobTypeDto,
} from './dto/jobs.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly queues = new Map<JobTypeDto, Queue>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
  ) {}

  async createJob(userId: string, dto: CreateJobDto) {
    const existing = await this.prisma.job.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) {
      return {
        job_id: existing.id,
        status: this.toApiStatus(existing.status),
      };
    }

    const dedupKey = `${userId}:${dto.type}:${dto.idempotencyKey}`;
    const type = this.toDbType(dto.type);
    const priority = dto.priority ?? 50;
    const maxRetries = 5;

    const job = await this.prisma.job.create({
      data: {
        userId,
        type,
        status: JobStatus.PENDING,
        priority,
        idempotencyKey: dto.idempotencyKey,
        dedupKey,
        input: dto.input as object | undefined,
        metadata: dto.metadata as object | undefined,
      },
    });

    try {
      await this.getQueue(dto.type).add(
        dto.type,
        {
          job_id: job.id,
          user_id: userId,
          type: dto.type,
          input: dto.input ?? {},
          metadata: dto.metadata ?? {},
        },
        {
          jobId: dedupKey,
          attempts: maxRetries,
          priority,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Queue unavailable while enqueueing ${dto.type}: ${(error as Error).message}`,
      );
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          failedAt: new Date(),
          errorMessage: 'QUEUE_UNAVAILABLE',
        },
      });
      throw new ServiceUnavailableException(
        'Queue unavailable. Please retry shortly.',
      );
    }

    await this.prisma.job.update({
      where: { id: job.id },
      data: { queuedAt: new Date() },
    });

    return { job_id: job.id, status: JobStatusDto.PENDING };
  }

  async getJobStatus(userId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) throw new NotFoundException('Job not found');

    const signedResultUrl = job.resultUrl
      ? await this.storage.resolvePrivateFileUrl(job.resultUrl)
      : null;

    return {
      job_id: job.id,
      type: this.toApiType(job.type),
      status: this.toApiStatus(job.status),
      result_url: signedResultUrl,
      metadata: job.metadata as Record<string, unknown> | null,
      error: job.errorMessage,
    };
  }

  async handleAiCallback(
    dto: AiJobCallbackDto,
    token?: string,
  ): Promise<{ success: true }> {
    const expectedToken = this.config.getAiWebhookToken();
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid AI callback token');
    }

    const job = await this.prisma.job.findUnique({ where: { id: dto.job_id } });
    if (!job) throw new NotFoundException('Job not found');

    const newStatus = this.toDbStatus(dto.status);
    if (
      newStatus === JobStatus.PENDING ||
      newStatus === JobStatus.RETRYING ||
      newStatus === JobStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Callback status must be completed or failed',
      );
    }

    const retryCount =
      newStatus === JobStatus.FAILED
        ? Math.min(job.retryCount + 1, job.maxRetries)
        : job.retryCount;
    const updateData: Prisma.JobUpdateInput = {
      status: newStatus,
      resultUrl: dto.result_url ?? job.resultUrl,
      errorMessage: dto.error ?? null,
      retryCount,
      startedAt: job.startedAt ?? new Date(),
      completedAt: newStatus === JobStatus.COMPLETED ? new Date() : null,
      failedAt: newStatus === JobStatus.FAILED ? new Date() : null,
    };
    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    await this.prisma.job.update({
      where: { id: job.id },
      data: updateData,
    });

    await this.applyDomainStatusUpdate(
      job,
      newStatus,
      dto.result_url,
      dto.metadata,
    );

    if (newStatus === JobStatus.FAILED && retryCount >= job.maxRetries) {
      const apiType = this.toApiType(job.type);
      await this.getQueue(apiType).add(
        `${apiType}.dlq`,
        {
          job_id: job.id,
          user_id: job.userId,
          reason: dto.error ?? 'FAILED_MAX_RETRIES',
          metadata: dto.metadata ?? {},
        },
        {
          jobId: `dlq:${job.id}`,
          removeOnComplete: 5000,
          removeOnFail: 10000,
        },
      );
    }

    return { success: true };
  }

  private getQueue(type: JobTypeDto): Queue {
    const existing = this.queues.get(type);
    if (existing) return existing;

    const queue = new Queue(type, { connection: this.buildRedisConnection() });
    queue.on('error', (err) => {
      this.logger.warn(`Redis error (${type}): ${err.message}`);
    });
    this.queues.set(type, queue);
    return queue;
  }

  private buildRedisConnection() {
    const redisUrl = new URL(this.config.getRedisUrl());
    const isTls = redisUrl.protocol === 'rediss:';
    const rawDb = redisUrl.pathname.replace('/', '');
    const db = rawDb ? Number(rawDb) : 0;

    return {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || (isTls ? 6380 : 6379)),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      db: Number.isNaN(db) ? 0 : db,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      retryStrategy: () => null as number | null,
      tls: isTls ? {} : undefined,
    };
  }

  private toDbType(type: JobTypeDto): JobType {
    switch (type) {
      case JobTypeDto.AVATAR_GENERATION:
        return JobType.AVATAR_GENERATION;
      case JobTypeDto.CLOTHING_PROCESSING:
        return JobType.CLOTHING_PROCESSING;
      case JobTypeDto.METADATA_EXTRACTION:
        return JobType.METADATA_EXTRACTION;
      case JobTypeDto.VIRTUAL_TRYON:
        return JobType.VIRTUAL_TRYON;
      case JobTypeDto.STYLIST_RECOMMENDATION:
        return JobType.STYLIST_RECOMMENDATION;
    }
  }

  private toApiType(type: JobType): JobTypeDto {
    switch (type) {
      case JobType.AVATAR_GENERATION:
        return JobTypeDto.AVATAR_GENERATION;
      case JobType.CLOTHING_PROCESSING:
        return JobTypeDto.CLOTHING_PROCESSING;
      case JobType.METADATA_EXTRACTION:
        return JobTypeDto.METADATA_EXTRACTION;
      case JobType.VIRTUAL_TRYON:
        return JobTypeDto.VIRTUAL_TRYON;
      case JobType.STYLIST_RECOMMENDATION:
        return JobTypeDto.STYLIST_RECOMMENDATION;
    }
  }

  private toDbStatus(status: JobStatusDto): JobStatus {
    switch (status) {
      case JobStatusDto.PENDING:
        return JobStatus.PENDING;
      case JobStatusDto.PROCESSING:
        return JobStatus.PROCESSING;
      case JobStatusDto.COMPLETED:
        return JobStatus.COMPLETED;
      case JobStatusDto.FAILED:
        return JobStatus.FAILED;
      case JobStatusDto.RETRYING:
        return JobStatus.RETRYING;
    }
  }

  private toApiStatus(status: JobStatus): JobStatusDto {
    switch (status) {
      case JobStatus.PENDING:
        return JobStatusDto.PENDING;
      case JobStatus.PROCESSING:
        return JobStatusDto.PROCESSING;
      case JobStatus.COMPLETED:
        return JobStatusDto.COMPLETED;
      case JobStatus.FAILED:
        return JobStatusDto.FAILED;
      case JobStatus.RETRYING:
        return JobStatusDto.RETRYING;
    }
  }

  private async applyDomainStatusUpdate(
    job: { id: string; type: JobType; userId: string },
    status: JobStatus,
    resultUrl?: string,
    metadata?: Record<string, unknown>,
  ) {
    if (job.type === JobType.CLOTHING_PROCESSING) {
      await this.prisma.wardrobeItem.updateMany({
        where: { sourceJobId: job.id },
        data: {
          status,
          processedPath: resultUrl,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
      return;
    }

    if (job.type === JobType.AVATAR_GENERATION) {
      await this.prisma.avatar.updateMany({
        where: { sourceJobId: job.id },
        data: {
          status,
          modelPath: resultUrl,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
      await this.prisma.user.update({
        where: { id: job.userId },
        data: {
          modelGenerationStatus:
            status === JobStatus.COMPLETED
              ? ModelGenerationStatus.COMPLETED
              : status === JobStatus.FAILED
                ? ModelGenerationStatus.FAILED
                : ModelGenerationStatus.PENDING,
        },
      });
      return;
    }

    if (job.type === JobType.VIRTUAL_TRYON) {
      await this.prisma.outfit.updateMany({
        where: { sourceJobId: job.id },
        data: {
          status,
          resultPath: resultUrl,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    }
  }
}
