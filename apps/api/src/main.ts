import './config/load-dotenv';
import 'reflect-metadata';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppZodValidationPipe } from './common/zod-validation.pipe';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadEnv } from './config/env.config';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  // `bodyParser: false` desactiva el parser JSON por defecto de Nest (límite
  // 100kb de Express) para registrarlo con un límite acorde al contrato: el OCR
  // de tickets (`ExtractReceiptInputSchema`) admite hasta ~4 MB de base64, así
  // que 100kb provocaba un 413 «request entity too large» en cualquier foto
  // real. 5mb da holgura sobre los 4 MB del contrato + el envoltorio JSON.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.use(helmet());
  app.enableCors({ origin: env.API_CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new AppZodValidationPipe());

  // Swagger solo fuera de producción: no exponemos /api/docs en prod.
  if (env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cosas de Casa API')
      .setDescription('API de gestión del hogar en familia')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  }

  await app.listen(env.API_PORT);
}

void bootstrap();
