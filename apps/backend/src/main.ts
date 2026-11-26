import './config/load-env';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import {AppModule} from './app.module';
import {CRM} from './core/db/crm-tables';
import {CrmDatabase} from './core/db/crm-database';
import {bodyParserErrors, bodyParsers} from './core/http/body-parsers';

async function bootstrap() {
  // Body parsing is configured below (JSON, form posts and multipart uploads), so Nest's default parser is off.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {bodyParser: false});

  // Behind a reverse proxy (nginx), trust its X-Forwarded-* headers. Set TRUST_PROXY=1 (hops) or false.
  app.set('trust proxy', process.env.TRUST_PROXY?.trim() || 'loopback');
  app.disable('x-powered-by');

  // The API only serves JSON and stored files; the browser UI is served by the frontend (Vite / static host).
  app.use(
    helmet({
      crossOriginResourcePolicy: {policy: 'same-origin'},
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'object-src': ["'self'", 'blob:', 'data:'],
        },
      },
    }),
  );
  app.use(compression());

  // Same-origin by default (the frontend proxies /api). Other origins must be listed in CORS_ORIGINS.
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({origin: origins, credentials: true});

  app.use('/api', ...bodyParsers, bodyParserErrors);

  // An application is addressed by its number (A-000-26-00001) in URLs; internally it is the uuid, so the number in the path is swapped for it before routing.
  const db = app.get(CrmDatabase);
  app.use('/api/v1/applications', async (req: any, _res: any, next: any) => {
    try {
      const m = /^\/(A-\d{3}-\d{2}-\d{5})(?=\/|$|\?)/.exec(req.url);
      if (m) {
        const [rows] = await db.pool.execute<any[]>(`SELECT id FROM ${CRM.applications} WHERE application_number=? AND deleted_at IS NULL`, [m[1]]);
        if (rows[0]) req.url = `/${rows[0].id}${req.url.slice(m[0].length)}`;
      }
      next();
    } catch (e) {
      next(e);
    }
  });

  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port);
  console.log(
    `\n  Backend API ready : http://localhost:${port}/api  (database: ${process.env.DB_NAME || '-'})` +
      `\n  This port is the API only; open the app on the frontend URL (default http://localhost:3000).\n`,
  );
}

bootstrap();
