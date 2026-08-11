import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AppModule } from './app.module';

let cached: Express | null = null;

async function createApp(): Promise<Express> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: unknown, res: unknown) {
  if (!cached) {
    cached = await createApp();
  }
  return cached(req as never, res as never);
}
