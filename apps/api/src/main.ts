import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule, webRoot } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
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

  const staticRoot = webRoot;
  if (staticRoot && existsSync(join(staticRoot, 'index.html'))) {
    // Express 5-safe SPA fallback (no bare "*" routes)
    app.use(
      (
        req: { method: string; path: string },
        res: { sendFile: (p: string) => void },
        next: () => void,
      ) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (req.path.startsWith('/api')) return next();
        // Let static assets 404 fall through to index for client routes only
        if (req.path.includes('.') && !req.path.endsWith('.html')) return next();
        res.sendFile(join(staticRoot, 'index.html'));
      },
    );
  }

  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(
    `ClientForge API listening on http://${host}:${port} (static=${staticRoot ?? 'none'})`,
  );
}

bootstrap();
