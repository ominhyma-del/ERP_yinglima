import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/exceptions/global-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Required so req.cookies.refreshToken is populated — without this middleware
  // the httpOnly refresh-token cookie set on /auth/login was silently never
  // readable by /auth/refresh or /auth/logout.
  app.use(cookieParser());

  // Enable CORS. NOTE: browsers reject `origin: '*'` together with
  // `credentials: true` (needed for the httpOnly refresh-token cookie), so we
  // reflect the request's own origin instead. Restrict this to trusted
  // origins in production via CORS_ORIGIN (comma-separated).
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy.`), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable NestJS Graceful Shutdown Hooks for SIGTERM / SIGINT
  app.enableShutdownHooks();

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger OpenAPI Setup
  const config = new DocumentBuilder()
    .setTitle('Enterprise Multi-Tenant ERP API')
    .setDescription(
      'Production-ready NestJS Clean Architecture REST APIs for Multi-Company ERP Platform.',
    )
    .setVersion('1.0')
    .addTag('Company Management')
    .addTag('Supplier Management')
    .addTag('Buyer Management')
    .addTag('Product Master')
    .addTag('Inquiry & Consignment Management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Enterprise ERP Backend Service running on port ${port}`);
  logger.log(`📚 Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
