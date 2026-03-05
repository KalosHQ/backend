import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DeviceService } from './device.service';

@Module({
  imports: [PrismaModule],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
