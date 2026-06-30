// api/src/main.ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InsufficientCreditsFilter } from './common/filters/insufficient-credits.filter';

async function bootstrap(): Promise<void> {
  // rawBody: true captures the exact request bytes on `req.rawBody` (needed for
  // webhook HMAC verification) while still running the normal JSON body parser,
  // so the global ValidationPipe keeps working for every other route.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new InsufficientCreditsFilter());
  app.enableShutdownHooks();
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
