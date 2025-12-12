import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { VerificationService } from './verification.service';
import { VerificationRepository } from './verification.repository';
import { VerificationController } from './verification.controller';
import { AdminVerificationController } from './admin-verification.controller';
import { AuditModule } from 'src/modules/logging/audit.module';

@Module({
  imports: [PrismaModule, StorageModule, AuditModule],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService, VerificationRepository],
})
export class VerificationModule {}
