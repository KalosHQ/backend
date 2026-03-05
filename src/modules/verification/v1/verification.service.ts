/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerificationRepository } from './verification.repository';
import { VerificationStatus, VerificationType, Role } from '@prisma/client';
import { StorageService } from 'src/modules/storage/storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/logging/audit.service';

@Injectable()
export class VerificationService {
  constructor(
    private readonly repo: VerificationRepository,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async requestVerification(
    userId: string,
    type: VerificationType,
    payload?: Record<string, any>,
    files?: Array<{ filename: string; mimeType?: string; base64: string }>,
  ) {
    const existing = await this.prisma.verificationRequest.findFirst({
      where: { userId, type, status: VerificationStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException('Pending request already exists');
    }

    const request = await this.repo.createRequest({ userId, type, payload });

    if (files?.length) {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const buffer = Buffer.from(file.base64, 'base64');
          const uploaded = await this.storage.uploadFile({
            buffer,
            filename: file.filename,
            mimeType: file.mimeType,
          });
          return {
            path: uploaded.path,
            filename: file.filename,
            mimeType: file.mimeType,
          };
        }),
      );
      await this.repo.addAttachments(request.id, uploads);
    }

    return this.repo.findById(request.id);
  }

  async listPending() {
    return this.repo.findPending();
  }

  async approve(id: string, adminId: string, reviewNotes?: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request already decided');
    }

    await this.repo.updateStatus(
      id,
      VerificationStatus.APPROVED,
      reviewNotes,
      adminId,
    );
    const newRole =
      request.type === VerificationType.CREATOR ? Role.CREATOR : Role.VENDOR;
    await this.prisma.user.update({
      where: { id: request.userId },
      data: { role: newRole, isVerified: true },
    });
    await this.audit.log({
      adminId,
      userId: request.userId,
      action: 'verification_approved',
      meta: { requestId: id, type: request.type, notes: reviewNotes },
    });
    return this.repo.findById(id);
  }

  async reject(id: string, adminId: string, reviewNotes?: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request already decided');
    }

    await this.repo.updateStatus(
      id,
      VerificationStatus.REJECTED,
      reviewNotes,
      adminId,
    );
    await this.audit.log({
      adminId,
      userId: request.userId,
      action: 'verification_rejected',
      meta: { requestId: id, type: request.type, notes: reviewNotes },
    });
    return this.repo.findById(id);
  }
}
