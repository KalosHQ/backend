/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
