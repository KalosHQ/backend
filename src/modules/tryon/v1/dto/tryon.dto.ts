import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobStatusDto } from 'src/modules/jobs/v1/dto/jobs.dto';

export class TryOnDto {
  @ApiProperty({ example: 'wardrobe_item_id' })
  @IsString()
  @IsNotEmpty()
  wardrobeItemId!: string;

  @ApiPropertyOptional({ example: 'avatar_id' })
  @IsOptional()
  @IsString()
  avatarId?: string;
}

export class TryOnResponseDto {
  @ApiProperty({ example: 'outfit_123' })
  outfit_id!: string;

  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.PENDING })
  job_status!: JobStatusDto;
}
