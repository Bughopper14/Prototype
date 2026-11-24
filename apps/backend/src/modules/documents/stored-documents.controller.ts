import fs from 'node:fs/promises';
import path from 'node:path';
import {Controller, Get, Req, Res} from '@nestjs/common';
import type {Response} from 'express';
import type {HttpRequest} from '../../core/http/api-request';
import {StorageService} from '../../core/storage';
import {requireAuthority} from '../auth/session';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** GET /documents/<type>/<file>: identity documents stored on disk, for signed-in users who may view them. */
@Controller('documents')
export class StoredDocumentsController {
  constructor(private readonly storage: StorageService) {}

  @Get('*path')
  async file(@Req() req: HttpRequest, @Res() res: Response) {
    requireAuthority(
      req.actor!,
      'CRM_STAKEHOLDER_VIEW',
      'CRM_LEGAL_VIEW',
      'CRM_DOCUMENT_VIEW',
      'CRM_DOCUMENT-DESK_VIEW',
      'CRM_STAKEHOLDER_EDIT',
      'CRM_LEGAL_EDIT',
    );
    const rawSegments = ([] as string[]).concat((req.params as any).path ?? []);
    let file = this.storage.documentPath(rawSegments);
    let stat = file ? await fs.stat(file).catch(() => null) : null;

    // Fallback: If not found directly, locate named file recursively in subdirectories (documents/<appNumber>/<jenisDoc>/)
    if (!stat || !stat.isFile()) {
      const fileName = rawSegments.length ? rawSegments[rawSegments.length - 1] : '';
      if (fileName) {
        const found = await this.storage.locateNamedCopy(fileName);
        if (found) {
          const foundStat = await fs.stat(found).catch(() => null);
          if (foundStat && foundStat.isFile()) {
            file = found;
            stat = foundStat;
          }
        }
      }
    }

    if (!file || !stat || !stat.isFile()) return res.status(404).send('Not found');

    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    try {
      const body = await fs.readFile(file);
      const ext = path.extname(file).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
      const baseName = path.basename(file);
      res
        .setHeader('Content-Type', contentType)
        .setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(baseName)}`)
        .setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800')
        .setHeader('ETag', etag)
        .setHeader('Last-Modified', stat.mtime.toUTCString())
        .send(body);
    } catch {
      res.status(404).send('Not found');
    }
  }
}
