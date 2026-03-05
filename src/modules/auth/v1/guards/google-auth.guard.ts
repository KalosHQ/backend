/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  getRequest(context: ExecutionContext) {
    const fastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
    const rawRequest = fastifyRequest.raw as any;

    rawRequest.query = fastifyRequest.query;
    return rawRequest;
  }

  getResponse(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<FastifyReply>();
    return response.raw;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      this.logger.log('GoogleAuthGuard canActivate called');
      const result = (await super.canActivate(context)) as boolean;
      this.logger.log(`canActivate result: ${result}`);

      if (result) {
        // Copy user from raw request to Fastify request
        const rawRequest = this.getRequest(context) as any;
        const fastifyRequest = context
          .switchToHttp()
          .getRequest<FastifyRequest>() as any;
        fastifyRequest.user = rawRequest.user;
        this.logger.log(`User attached: ${JSON.stringify(rawRequest.user)}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Google auth error: ${error}`);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(
      `handleRequest - err: ${err}, user: ${JSON.stringify(user)}, info: ${info}`,
    );
    if (err || !user) {
      this.logger.error(`Authentication failed: ${err || 'No user returned'}`);
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}
