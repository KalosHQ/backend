import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobStatusDto } from 'src/modules/jobs/v1/dto/jobs.dto';

export class AddWardrobeItemDto {
  @ApiProperty({
    description: 'Base64 image content (data URL allowed)',
    example: 'iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  fileBase64!: string;

  @ApiProperty({
    example: 'shirt.png',
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiPropertyOptional({ example: 'tops' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'black' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class AddWardrobeItemResponseDto {
  @ApiProperty({ example: 'wardrobe_item_123' })
  wardrobe_item_id!: string;

  @ApiProperty({
    example: 's3://kalos-private-storage/wardrobe/raw/user-id/shirt.png',
  })
  original_path!: string;

  @ApiProperty({
    example: 'https://signed-url-from-private-s3',
    description: 'Presigned URL for private wardrobe image',
  })
  original_url!: string;

  @ApiProperty({ example: 'job_123' })
  job_id!: string;

  @ApiProperty({ enum: JobStatusDto, example: JobStatusDto.PENDING })
  job_status!: JobStatusDto;
}
