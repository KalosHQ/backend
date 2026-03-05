import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OnboardingBodyType,
  OnboardingGender,
  OnboardingModelMethod,
  SetModelCustomizationDto,
} from './dto/onboarding.dto';
import {
  ModelBodyType,
  ModelCustomizationMethod,
  ModelGender,
  ModelGenerationStatus,
} from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (dto.method === OnboardingModelMethod.PHOTO) {
      // TODO: Replace this with S3 upload flow once the upload pipeline is implemented.
      throw new BadRequestException(
        'Photo onboarding is not implemented yet. TODO: integrate AWS S3 upload flow.',
      );
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
          photoPath: null,
        },
        update: {
          method: this.mapMethod(dto.method),
          gender: this.mapGender(dto.gender),
          bodyType: this.mapBodyType(dto.bodyType),
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          photoPath: null,
        },
      });

      // TODO: Call AI team's model-generation endpoint here (async job trigger).
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompletedAt: new Date(),
          modelGenerationStatus: ModelGenerationStatus.PENDING,
        },
      });
    });

    return this.getOnboardingStatus(userId);
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
}
