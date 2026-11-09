import fs from 'node:fs/promises';
import path from 'node:path';
import {Controller, Get, Req, Res} from '@nestjs/common';
import type {Response} from 'express';
import type {HttpRequest} from '../../core/http/api-request';
import {documentsDir} from '../../core/storage';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** GET /documents/<type>/<file>: identity documents stored on disk, for signed-in users only (SessionGuard). */
@Controller('documents')
export class StoredDocumentsController {
  @Get('*path')
  async file(@Req() req: HttpRequest, @Res() res: Response) {
    const segments = ([] as string[]).concat((req.params as any).path ?? []);
    const file = path.resolve(documentsDir, ...segments);
    if (!file.startsWith(documentsDir + path.sep)) return res.status(404).send('Not found');
    try {
      const body = await fs.readFile(file);
      res
        .setHeader(
          'Content-Type',
          CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        )
        .setHeader('Cache-Control', 'private, max-age=300')
        .send(body);
    } catch {
      res.status(404).send('Not found');
    }
  }
}
