import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ShopperStyle {
  MINIMALIST = 'minimalist',
  STREET_WEAR = 'street wear',
  Y2K = 'y2k',
  CASUAL = 'casual',
  FORMAL = 'formal',
  VINTAGE = 'vintage',
  SPORTY = 'sporty',
  BOHEMIAN = 'bohemian',
  EDGY = 'edgy',
  PREPPY = 'preppy',
  TRENDY = 'trendy',
  GOTHIC = 'gothic',
  ARTSY = 'artsy',
  CLASSIC = 'classic',
}

export enum OnboardingModelMethod {
  PHOTO = 'photo',
  MEASUREMENTS = 'measurements',
}

export enum OnboardingGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum OnboardingBodyType {
  SLIM = 'slim',
  ATHLETIC = 'athletic',
  PLUS_SIZE = 'plus size',
  CURVY = 'curvy',
}

export class SetModelCustomizationDto {
  @ApiProperty({
    isArray: true,
    enum: ShopperStyle,
    description: 'Choose up to 5 styles',
    maxItems: 5,
    example: ['minimalist', 'casual', 'classic'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsEnum(ShopperStyle, { each: true })
  styles!: ShopperStyle[];

  @ApiProperty({
    enum: OnboardingModelMethod,
    description: 'How user wants model setup',
    example: OnboardingModelMethod.MEASUREMENTS,
  })
  @IsEnum(OnboardingModelMethod)
  method!: OnboardingModelMethod;

  @ApiProperty({
    enum: OnboardingGender,
    example: OnboardingGender.FEMALE,
  })
  @IsEnum(OnboardingGender)
  gender!: OnboardingGender;

  @ApiProperty({
    enum: OnboardingBodyType,
    example: OnboardingBodyType.ATHLETIC,
  })
  @IsEnum(OnboardingBodyType)
  bodyType!: OnboardingBodyType;

  @ApiProperty({
    description: 'Height in centimeters',
    example: 170,
  })
  @IsInt()
  @Min(100)
  @Max(260)
  heightCm!: number;

  @ApiProperty({
    description: 'Weight in kilograms',
    example: 65,
  })
  @IsInt()
  @Min(25)
  @Max(400)
  weightKg!: number;

  @ApiProperty({
    required: false,
    description:
      'Base64-encoded image content (required when method=photo). Data URL format is also supported.',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @ValidateIf(
    (o: SetModelCustomizationDto) => o.method === OnboardingModelMethod.PHOTO,
  )
  @IsString()
  @IsNotEmpty()
  photoBase64?: string;

  @ApiProperty({
    required: false,
    description: 'Original image filename (required when method=photo)',
    example: 'onboarding-photo.png',
  })
  @ValidateIf(
    (o: SetModelCustomizationDto) => o.method === OnboardingModelMethod.PHOTO,
  )
  @IsString()
  @IsNotEmpty()
  photoFilename?: string;
}

export class OnboardingModelCustomizationResponseDto {
  @ApiProperty({ example: 'MEASUREMENTS', nullable: true })
  method!: string;

  @ApiProperty({ example: 'FEMALE', nullable: true })
  gender!: string;

  @ApiProperty({ example: 'ATHLETIC', nullable: true })
  bodyType!: string;

  @ApiProperty({ example: 170, nullable: true })
  heightCm!: number;

  @ApiProperty({ example: 65, nullable: true })
  weightKg!: number;

  @ApiProperty({ example: true })
  hasPhoto!: boolean;

  @ApiProperty({
    example: 's3://kalos-private-storage/avatars/user-id/photo.png',
    nullable: true,
  })
  photoPath!: string | null;

  @ApiProperty({
    example: 'https://signed-url-from-private-s3',
    nullable: true,
    description: 'Presigned URL generated for private bucket photo path',
  })
  photoUrl!: string | null;
}

export class OnboardingStatusResponseDto {
  @ApiProperty({
    type: [String],
    example: ['minimalist', 'casual', 'classic'],
  })
  styles!: string[];

  @ApiProperty({
    type: OnboardingModelCustomizationResponseDto,
    nullable: true,
  })
  modelCustomization!: OnboardingModelCustomizationResponseDto | null;

  @ApiProperty({
    nullable: true,
    example: '2026-03-08T22:00:00.000Z',
  })
  onboardingCompletedAt!: string | null;

  @ApiProperty({
    example: 'PENDING',
    description: 'Model generation lifecycle status',
  })
  modelGenerationStatus!: string;
}
