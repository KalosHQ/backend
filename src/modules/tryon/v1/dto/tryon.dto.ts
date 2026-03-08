import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
