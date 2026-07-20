// api/src/main.ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { InsufficientCreditsFilter } from './common/filters/insufficient-credits.filter';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { requestContext } from './common/logging/request-context.middleware';

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

  // Behind the nginx proxy chain (host proxy → gateway), so trust it: this makes
  // Express derive req.ip from X-Forwarded-For, which the rate limiter keys on.
  // Set to the number of proxy hops (spoofable if too high). Override via env.
  const trustHops = Number(process.env.TRUST_PROXY_HOPS ?? 2);
  app.getHttpAdapter().getInstance().set('trust proxy', trustHops);

  // Correlate every log line for a request (must run before guards/handlers).
  app.use(requestContext);
  // Security headers on API responses (defence in depth; the SPA's own headers
  // live on the web nginx tier).
  app.use(helmet());

  app.setGlobalPrefix('', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Order matters: the catch-all logs + formats everything, and the credits
  // filter is registered LAST so Nest (which evaluates global filters in
  // reversed order) checks it first for its specific InsufficientCreditsError.
  app.useGlobalFilters(
    new AllExceptionsFilter(app.getHttpAdapter()),
    new InsufficientCreditsFilter(),
  );
  app.enableShutdownHooks();
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
