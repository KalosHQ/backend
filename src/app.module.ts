import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/v1/auth.module';
import { UsersModule } from './modules/users/v1/users.module';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { DeviceModule } from './modules/device/v1/device.module';
import { AuthLogModule } from './modules/logging/auth-log.module';
import { AuditModule } from './modules/logging/audit.module';
import { StorageModule } from './modules/storage/storage.module';
import { VerificationModule } from './modules/verification/v1/verification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DeviceModule,
    AuthLogModule,
    AuditModule,
    StorageModule,
    VerificationModule,
    ConfigModule.forRoot(),
    AppConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
