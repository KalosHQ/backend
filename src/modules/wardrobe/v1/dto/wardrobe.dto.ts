import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
