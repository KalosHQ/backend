/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationType } from '@prisma/client';

export class RequestVerificationDto {
  @ApiProperty({
    description: 'Type of verification requested',
    enum: VerificationType,
    example: VerificationType.CREATOR,
  })
  @IsEnum(VerificationType)
  type!: VerificationType;

  @ApiPropertyOptional({
    description: 'Additional payload data for verification',
    example: { businessName: 'My Store', taxId: '123456789' },
  })
  @IsOptional()
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Supporting documents as base64 encoded files',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        filename: { type: 'string', example: 'id-document.pdf' },
        mimeType: { type: 'string', example: 'application/pdf' },
        base64: { type: 'string', example: 'JVBERi0xLjQKJcfsj6...' },
      },
    },
  })
  @IsOptional()
  files?: Array<{
    filename: string;
    mimeType?: string;
    base64: string;
  }>;
}

export class AdminDecisionDto {
  @ApiPropertyOptional({
    description: 'Admin notes on the verification decision',
    example: 'All documents verified successfully',
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class VerificationIdParamDto {
  @ApiProperty({
    description: 'Verification request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
