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
    description:
      'Type of verification requested. Must align with endpoint path (`creator` or `vendor`).',
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

export class VerificationAttachmentResponseDto {
  @ApiProperty({ example: 'attachment_123' })
  id!: string;

  @ApiProperty({ example: 'verification_request_123' })
  requestId!: string;

  @ApiProperty({
    example: 's3://kalos-private-storage/verification/id-document.pdf',
  })
  path!: string;

  @ApiProperty({ example: 'id-document.pdf' })
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  uploadedAt!: string;

  @ApiProperty({
    example: 'https://signed-url-from-private-s3',
    description: 'Presigned URL for private attachment path',
  })
  url!: string;
}

export class VerificationRequestResponseDto {
  @ApiProperty({ example: 'verification_request_123' })
  id!: string;

  @ApiProperty({ example: 'user_123' })
  userId!: string;

  @ApiProperty({ enum: VerificationType, example: VerificationType.CREATOR })
  type!: VerificationType;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiPropertyOptional({
    description: 'Additional verification payload data',
    type: 'object',
    additionalProperties: true,
  })
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: 'admin_123', nullable: true })
  adminId?: string | null;

  @ApiPropertyOptional({
    example: 'All documents verified successfully',
    nullable: true,
  })
  reviewNotes?: string | null;

  @ApiProperty({ example: '2026-03-08T22:00:00.000Z' })
  submittedAt!: string;

  @ApiPropertyOptional({
    example: '2026-03-08T23:00:00.000Z',
    nullable: true,
  })
  reviewedAt?: string | null;

  @ApiProperty({ type: [VerificationAttachmentResponseDto] })
  attachments!: VerificationAttachmentResponseDto[];
}

export class AdminVerificationDecisionResponseDto extends VerificationRequestResponseDto {}
