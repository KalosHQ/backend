import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppConfigService } from './config/config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookie from '@fastify/cookie';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const appConfig = app.get(AppConfigService);
  await app.register(cookie, {
    secret: appConfig.getCookieSecret(),
  });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Kalos API')
    .setDescription('Kalos Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh token stored in HTTP-only cookie',
    })
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Verification', 'Creator and vendor verification endpoints')
    .addTag('Jobs', 'Asynchronous AI job orchestration and status tracking')
    .addTag('Wardrobe', 'Wardrobe upload and metadata APIs')
    .addTag('Avatar', 'Avatar generation APIs')
    .addTag('TryOn', 'Virtual try-on APIs')
    .addTag('Stylist', 'AI stylist request APIs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Downloadable OpenAPI JSON spec
  app.getHttpAdapter().get('/api-docs/openapi.json', (req, res) => {
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', 'attachment; filename="kalos-openapi.json"');
    res.send(JSON.stringify(document, null, 2));
  });

  await app.listen(appConfig.getPort(), '0.0.0.0');
}
void bootstrap();
