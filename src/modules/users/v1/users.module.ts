import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from 'src/modules/auth/v1/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { JobsModule } from 'src/modules/jobs/v1/jobs.module';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, JobsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
