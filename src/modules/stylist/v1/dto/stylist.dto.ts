import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
