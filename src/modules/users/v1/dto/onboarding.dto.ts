import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
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
}
