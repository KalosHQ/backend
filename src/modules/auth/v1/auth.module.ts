import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthControllerV1 } from './auth.controller';
import { AuthServiceV1 } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DeviceModule } from 'src/modules/device/v1/device.module';
import { AuthLogModule } from 'src/modules/logging/auth-log.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { RoleGuard } from './guards/role.guard';
import { VerifiedGuard } from './guards/verified.guard';
import { AppConfigModule } from 'src/config/config.module';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
    DeviceModule,
    AuthLogModule,
    AppConfigModule,
  ],
  controllers: [AuthControllerV1],
  providers: [
    AuthServiceV1,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    FacebookStrategy,
    RoleGuard,
    VerifiedGuard,
    JwtAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [RoleGuard, VerifiedGuard],
})
export class AuthModule {}
