/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { VerificationType } from '@prisma/client';

export class RequestVerificationDto {
  @IsEnum(VerificationType)
  type!: VerificationType;

  @IsOptional()
  payload?: Record<string, any>;

  @IsOptional()
  files?: Array<{
    filename: string;
    mimeType?: string;
    base64: string;
  }>;
}

export class AdminDecisionDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class VerificationIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
