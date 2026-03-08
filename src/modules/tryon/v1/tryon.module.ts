import { Module } from '@nestjs/common';
import { TryOnController } from './tryon.controller';
import { TryOnService } from './tryon.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { JobsModule } from '../../jobs/v1/jobs.module';

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [TryOnController],
  providers: [TryOnService],
  exports: [TryOnService],
})
export class TryOnModule {}
