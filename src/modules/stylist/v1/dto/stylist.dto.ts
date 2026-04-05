import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobStatusDto } from 'src/modules/jobs/v1/dto/jobs.dto';

export class AskStylistDto {
  @ApiProperty({
    example: 'Create 3 weekend outfit ideas from my wardrobe',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ example: 'casual, weekend, warm-weather' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class AskStylistResponseDto {
  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.PENDING })
  job_status!: JobStatusDto;

  @ApiProperty({
    example: 'Stylist request accepted. Poll /v1/jobs/:id for result.',
  })
  message!: string;
}
