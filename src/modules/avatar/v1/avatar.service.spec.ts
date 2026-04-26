import { Test, TestingModule } from '@nestjs/testing';
import { JobStatusDto } from '../../jobs/v1/dto/jobs.dto';
import { JobsService } from '../../jobs/v1/jobs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AvatarBodyType,
  AvatarExportFormat,
  AvatarGender,
  GenerateAvatarDto,
} from './dto/avatar.dto';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  let service: AvatarService;
  let prisma: {
    avatar: {
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jobsService: {
    createJob: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      avatar: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jobsService = {
      createJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JobsService,
          useValue: jobsService,
        },
      ],
    }).compile();

    service = module.get<AvatarService>(AvatarService);
  });

  it('creates a pending avatar, enqueues an avatar generation job, and returns ids', async () => {
    const dto: GenerateAvatarDto = {
      heightCm: 170,
      weightKg: 65,
      bodyType: AvatarBodyType.AVERAGE,
      gender: AvatarGender.NEUTRAL,
      exportFormat: AvatarExportFormat.GLB,
    };

    prisma.avatar.create.mockResolvedValue({ id: 'avatar-123' });
    jobsService.createJob.mockResolvedValue({
      job_id: 'job-123',
      status: JobStatusDto.PENDING,
    });
    prisma.avatar.update.mockResolvedValue({
      id: 'avatar-123',
      sourceJobId: 'job-123',
    });

    await expect(service.generateAvatar('user-123', dto)).resolves.toEqual({
      avatar_id: 'avatar-123',
      job_id: 'job-123',
      job_status: JobStatusDto.PENDING,
    });

    expect(prisma.avatar.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        status: 'PENDING',
        metadata: {
          source: 'avatar_endpoint',
          requested_input: {
            heightCm: 170,
            weightKg: 65,
            bodyType: 'average',
            gender: 'neutral',
            exportFormat: 'glb',
          },
        },
      },
    });

    expect(jobsService.createJob).toHaveBeenCalledWith('user-123', {
      type: 'avatar_generation',
      idempotencyKey: 'avatar-generation-avatar-123',
      priority: 80,
      input: {
        avatar_id: 'avatar-123',
        height_cm: 170,
        weight_kg: 65,
        body_type: 'average',
        gender: 'neutral',
        export_format: 'glb',
      },
      metadata: {
        source: 'avatar_endpoint',
        avatar_id: 'avatar-123',
      },
    });

    expect(prisma.avatar.update).toHaveBeenCalledWith({
      where: { id: 'avatar-123' },
      data: { sourceJobId: 'job-123' },
    });
  });
});
