import { Test, TestingModule } from '@nestjs/testing';
import {
  AvatarBodyType,
  AvatarExportFormat,
  AvatarGender,
  GenerateAvatarDto,
} from './dto/avatar.dto';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';

describe('AvatarController', () => {
  let controller: AvatarController;
  let avatarService: {
    generateAvatar: jest.Mock;
  };

  beforeEach(async () => {
    avatarService = {
      generateAvatar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvatarController],
      providers: [
        {
          provide: AvatarService,
          useValue: avatarService,
        },
      ],
    }).compile();

    controller = module.get<AvatarController>(AvatarController);
  });

  it('delegates avatar generation to AvatarService', async () => {
    const dto: GenerateAvatarDto = {
      heightCm: 170,
      weightKg: 65,
      bodyType: AvatarBodyType.AVERAGE,
      gender: AvatarGender.NEUTRAL,
      exportFormat: AvatarExportFormat.GLB,
    };

    avatarService.generateAvatar.mockResolvedValue({
      avatar_id: 'avatar-123',
      job_id: 'job-123',
      job_status: 'pending',
    });

    await expect(
      controller.generateAvatar({ sub: 'user-123' }, dto),
    ).resolves.toEqual({
      avatar_id: 'avatar-123',
      job_id: 'job-123',
      job_status: 'pending',
    });

    expect(avatarService.generateAvatar).toHaveBeenCalledWith(
      'user-123',
      dto,
    );
  });
});
