import { Module } from '@nestjs/common';
import { AppConfigModule } from 'src/config/config.module';
import { OtpService } from './otp.service';

@Module({
  imports: [AppConfigModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
