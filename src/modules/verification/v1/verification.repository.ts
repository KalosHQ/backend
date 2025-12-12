/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerificationStatus, VerificationType } from '@prisma/client';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRequest(params: {
    userId: string;
    type: VerificationType;
    payload?: Record<string, any>;
  }) {
    return this.prisma.verificationRequest.create({
      data: {
        userId: params.userId,
        type: params.type,
        payload: params.payload as any,
        status: VerificationStatus.PENDING,
      },
    });
  }

  addAttachments(
    requestId: string,
    attachments: Array<{
      path: string;
      filename: string;
      mimeType?: string;
    }>,
  ) {
    if (!attachments.length) return Promise.resolve();
    return this.prisma.verificationAttachment.createMany({
      data: attachments.map((a) => ({
        requestId,
        path: a.path,
        filename: a.filename,
        mimeType: a.mimeType ?? 'application/octet-stream',
      })),
    });
  }

  findPending() {
    return this.prisma.verificationRequest.findMany({
      where: { status: VerificationStatus.PENDING },
      include: { attachments: true, user: true },
      orderBy: { submittedAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { attachments: true, user: true },
    });
  }

  updateStatus(
    id: string,
    status: VerificationStatus,
    reviewNotes?: string,
    adminId?: string,
  ) {
    return this.prisma.verificationRequest.update({
      where: { id },
      data: { status, reviewNotes, adminId, reviewedAt: new Date() },
    });
  }
}
