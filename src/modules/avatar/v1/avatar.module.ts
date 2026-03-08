import { Module } from '@nestjs/common';
import { AvatarController } from './avatar.controller';
import { UsersModule } from '../../users/v1/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AvatarController],
})
export class AvatarModule {}
