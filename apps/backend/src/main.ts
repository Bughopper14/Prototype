import './config/load-env';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import {AppModule} from './app.module';
import {bodyParserErrors, bodyParsers} from './core/http/body-parsers';

async function bootstrap() {
  // Body parsing is configured below (JSON, form posts and multipart uploads), so Nest's default parser is off.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {bodyParser: false});

  // Behind a reverse proxy (nginx), trust its X-Forwarded-* headers. Set TRUST_PROXY=1 (hops) or false.
  app.set('trust proxy', process.env.TRUST_PROXY?.trim() || 'loopback');
  app.disable('x-powered-by');

  // The API only serves JSON and stored files; the browser UI is served by the frontend (Vite / static host).
  app.use(helmet({crossOriginResourcePolicy: {policy: 'same-origin'}}));
  app.use(compression());

  // Same-origin by default (the frontend proxies /api). Other origins must be listed in CORS_ORIGINS.
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({origin: origins, credentials: true});

  app.use('/api', ...bodyParsers, bodyParserErrors);

  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port);
  console.log(
    `\n  Backend API ready : http://localhost:${port}/api  (database: ${process.env.DB_NAME || '-'})` +
      `\n  This port is the API only; open the app on the frontend URL (default http://localhost:3000).\n`,
  );
}

bootstrap();
