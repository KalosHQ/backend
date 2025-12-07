import { Module } from '@nestjs/common';
import { AuthServiceV1 } from './auth.service';
import { AuthControllerV1 } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AuthControllerV1],
  providers: [AuthServiceV1],
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
})
export class AuthModule {}
