import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum JobTypeDto {
  AVATAR_GENERATION = 'avatar_generation',
  CLOTHING_PROCESSING = 'clothing_processing',
  METADATA_EXTRACTION = 'metadata_extraction',
  VIRTUAL_TRYON = 'virtual_tryon',
  STYLIST_RECOMMENDATION = 'stylist_recommendation',
}

export enum JobStatusDto {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export class CreateJobDto {
  @ApiProperty({ enum: JobTypeDto, example: JobTypeDto.AVATAR_GENERATION })
  @IsEnum(JobTypeDto)
  type!: JobTypeDto;

  @ApiProperty({
    description: 'Idempotency key unique per user for safe retries',
    example: 'avatar-user123-v2',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiPropertyOptional({
    description: 'Priority from 1 (low) to 100 (high)',
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Job-specific payload consumed by AI workers',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional metadata for orchestration and tracing',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class JobResponseDto {
  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.PENDING })
  status!: JobStatusDto;
}

export class JobStatusResponseDto {
  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({ enum: JobTypeDto, example: JobTypeDto.AVATAR_GENERATION })
  type!: JobTypeDto;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.PROCESSING })
  status!: JobStatusDto;

  @ApiPropertyOptional({ example: 'https://signed-private-url' })
  result_url?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: 'MODEL_TIMEOUT' })
  error?: string | null;
}

export class AiJobCallbackDto {
  @ApiProperty({ example: 'job_123' })
  @IsString()
  @IsNotEmpty()
  job_id!: string;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.COMPLETED })
  @IsEnum(JobStatusDto)
  status!: JobStatusDto;

  @ApiPropertyOptional({
    example: 's3://kalos-private-storage/tryon/result.png',
  })
  @IsOptional()
  @IsString()
  result_url?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'MODEL_TIMEOUT' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class AiJobCallbackResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
