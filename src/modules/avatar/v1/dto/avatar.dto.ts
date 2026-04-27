import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { JobStatusDto } from '../../../jobs/v1/dto/jobs.dto';

export enum AvatarBodyType {
  SLIM = 'slim',
  ATHLETIC = 'athletic',
  AVERAGE = 'average',
  CURVY = 'curvy',
  PLUS = 'plus',
}

export enum AvatarGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral',
}

export enum AvatarExportFormat {
  OBJ = 'obj',
  GLTF = 'gltf',
}

export class GenerateAvatarDto {
  @ApiProperty({
    description: 'Height in centimeters',
    example: 170,
    minimum: 100,
    maximum: 250,
  })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @ApiProperty({
    description: 'Weight in kilograms',
    example: 65,
    minimum: 30,
    maximum: 300,
  })
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(300)
  weightKg!: number;

  @ApiProperty({
    enum: AvatarBodyType,
    example: AvatarBodyType.AVERAGE,
  })
  @IsEnum(AvatarBodyType)
  bodyType!: AvatarBodyType;

  @ApiProperty({
    enum: AvatarGender,
    example: AvatarGender.NEUTRAL,
  })
  @IsEnum(AvatarGender)
  gender!: AvatarGender;

  @ApiPropertyOptional({
    enum: AvatarExportFormat,
    example: AvatarExportFormat.OBJ,
    default: AvatarExportFormat.OBJ,
  })
  @IsOptional()
  @IsEnum(AvatarExportFormat)
  exportFormat: AvatarExportFormat = AvatarExportFormat.OBJ;
}

export class GenerateAvatarResponseDto {
  @ApiProperty({ example: 'avatar_123' })
  avatar_id!: string;

  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({
    enum: JobStatusDto,
    example: JobStatusDto.PENDING,
  })
  job_status!: JobStatusDto;
}
