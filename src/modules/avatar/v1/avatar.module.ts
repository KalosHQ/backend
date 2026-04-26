import { Module } from '@nestjs/common';
import { AvatarController } from './avatar.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { JobsModule } from '../../jobs/v1/jobs.module';
import { AvatarService } from './avatar.service';

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [AvatarController],
  providers: [AvatarService],
})
export class AvatarModule {}
