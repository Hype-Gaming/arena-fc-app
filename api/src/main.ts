// api/src/main.ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InsufficientCreditsFilter } from './common/filters/insufficient-credits.filter';

async function bootstrap(): Promise<void> {
  // Fail fast on a missing signing secret: without it JwtService would sign and
  // verify tokens with `undefined`, silently accepting forged/blank-secret
  // tokens. Refuse to boot rather than run insecurely.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set — refusing to start.');
  }

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
