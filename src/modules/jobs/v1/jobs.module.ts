import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { AppConfigModule } from '../../../config/config.module';
import { AiCallbackController } from './ai-callback.controller';

@Module({
  imports: [PrismaModule, StorageModule, AppConfigModule],
  controllers: [JobsController, AiCallbackController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
