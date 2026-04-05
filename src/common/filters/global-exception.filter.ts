import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message = this.extractMessage(payload);
      response.status(status).send({
        success: false,
        statusCode: status,
        error: this.errorLabel(status),
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(message, exception instanceof Error ? exception.stack : '');

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: this.errorLabel(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractMessage(
    payload: string | { message?: string | string[] } | object,
  ): string | string[] {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message?: string | string[] };
      if (message) {
        return message;
      }
    }

    return 'Request failed';
  }

  private errorLabel(status: number) {
    return HttpStatus[status] ?? 'Error';
  }
}

