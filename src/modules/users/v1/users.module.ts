import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from 'src/modules/auth/v1/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
