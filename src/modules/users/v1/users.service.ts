import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { JobsService } from '../../jobs/v1/jobs.service';
import { JobTypeDto } from '../../jobs/v1/dto/jobs.dto';
import {
  OnboardingBodyType,
  OnboardingGender,
  OnboardingModelMethod,
  SetModelCustomizationDto,
} from './dto/onboarding.dto';
import {
  JobStatus,
  ModelBodyType,
  ModelCustomizationMethod,
  ModelGender,
  ModelGenerationStatus,
} from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly jobsService: JobsService,
  ) {}

  create(_createUserDto: CreateUserDto) {
    void _createUserDto;
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, _updateUserDto: UpdateUserDto) {
    void _updateUserDto;
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async setModelCustomization(userId: string, dto: SetModelCustomizationDto) {
    const uniqueStyles = [...new Set(dto.styles)];
    if (uniqueStyles.length !== dto.styles.length) {
      throw new BadRequestException('styles must not contain duplicates');
    }

    let uploadedPhotoPath: string | null = null;
    if (dto.method === OnboardingModelMethod.PHOTO) {
      if (!dto.photoBase64 || !dto.photoFilename) {
        throw new BadRequestException(
          'photoBase64 and photoFilename are required when method is photo',
        );
      }

      const rawBase64 = this.stripDataUrlPrefix(dto.photoBase64);
      const buffer = Buffer.from(rawBase64, 'base64');
      const key = `avatars/${userId}/${Date.now()}-${dto.photoFilename}`;
      const uploaded = await this.storageService.uploadFile({
        buffer,
        filename: dto.photoFilename,
        key,
      });
      uploadedPhotoPath = uploaded.path;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userStylePreference.deleteMany({ where: { userId } });

      const styleRecords = await Promise.all(
        uniqueStyles.map((name) =>
          tx.style.upsert({
            where: { name },
            create: { name },
            update: {},
          }),
        ),
      );

      await tx.userStylePreference.createMany({
        data: styleRecords.map((style) => ({
          userId,
          styleId: style.id,
        })),
      });

      await tx.userModelProfile.upsert({
        where: { userId },
        create: {
          userId,
          method: this.mapMethod(dto.method),
          gender: this.mapGender(dto.gender),
          bodyType: this.mapBodyType(dto.bodyType),
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          photoPath: uploadedPhotoPath,
        },
        update: {
          method: this.mapMethod(dto.method),
          gender: this.mapGender(dto.gender),
          bodyType: this.mapBodyType(dto.bodyType),
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          photoPath: uploadedPhotoPath,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompletedAt: new Date(),
          modelGenerationStatus: ModelGenerationStatus.PENDING,
        },
      });
    });

    const avatarJob = await this.jobsService.createJob(userId, {
      type: JobTypeDto.AVATAR_GENERATION,
      idempotencyKey: `onboarding-avatar-${Date.now()}`,
      priority: 80,
      input: {
        method: dto.method,
        gender: dto.gender,
        bodyType: dto.bodyType,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        photoPath: uploadedPhotoPath,
        styles: uniqueStyles,
      },
      metadata: { source: 'user_onboarding' },
    });

    await this.prisma.avatar.create({
      data: {
        userId,
        metadata: {
          source: 'onboarding_model_customization',
          method: dto.method,
          hasPhoto: Boolean(uploadedPhotoPath),
        },
        status: JobStatus.PENDING,
        sourceJobId: avatarJob.job_id,
      },
    });

    const onboarding = await this.getOnboardingStatus(userId);
    return {
      ...onboarding,
      job_id: avatarJob.job_id,
      job_status: avatarJob.status,
    };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stylePreferences: {
          include: { style: true },
          orderBy: { createdAt: 'asc' },
        },
        modelProfile: true,
      },
    });
    if (!user) throw new BadRequestException('User not found');

    const photoUrl = user.modelProfile?.photoPath
      ? await this.storageService.resolvePrivateFileUrl(
          user.modelProfile.photoPath,
        )
      : null;

    return {
      styles: user.stylePreferences.map((p) => p.style.name),
      modelCustomization: user.modelProfile
        ? {
            method: user.modelProfile.method,
            gender: user.modelProfile.gender,
            bodyType: user.modelProfile.bodyType,
            heightCm: user.modelProfile.heightCm,
            weightKg: user.modelProfile.weightKg,
            hasPhoto: Boolean(user.modelProfile.photoPath),
            photoPath: user.modelProfile.photoPath,
            photoUrl,
          }
        : null,
      onboardingCompletedAt: user.onboardingCompletedAt,
      modelGenerationStatus: user.modelGenerationStatus,
    };
  }

  private mapMethod(method: OnboardingModelMethod): ModelCustomizationMethod {
    if (method === OnboardingModelMethod.PHOTO) {
      return ModelCustomizationMethod.PHOTO;
    }
    return ModelCustomizationMethod.MEASUREMENTS;
  }

  private mapGender(gender: OnboardingGender): ModelGender {
    if (gender === OnboardingGender.MALE) return ModelGender.MALE;
    if (gender === OnboardingGender.FEMALE) return ModelGender.FEMALE;
    return ModelGender.OTHER;
  }

  private mapBodyType(bodyType: OnboardingBodyType): ModelBodyType {
    if (bodyType === OnboardingBodyType.SLIM) return ModelBodyType.SLIM;
    if (bodyType === OnboardingBodyType.ATHLETIC) return ModelBodyType.ATHLETIC;
    if (bodyType === OnboardingBodyType.CURVY) return ModelBodyType.CURVY;
    return ModelBodyType.PLUS_SIZE;
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
