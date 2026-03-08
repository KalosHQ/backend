import { Module } from '@nestjs/common';
import { StylistController } from './stylist.controller';
import { StylistService } from './stylist.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { JobsModule } from '../../jobs/v1/jobs.module';

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [StylistController],
  providers: [StylistService],
  exports: [StylistService],
})
export class StylistModule {}
