import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    return request.raw; // ✅ Already have this
  }

  getResponse(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<FastifyReply>();
    return response.raw; // 👈 ADD THIS
  }
}