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
    const file = this.storage.documentPath(([] as string[]).concat((req.params as any).path ?? []));
    if (!file) return res.status(404).send('Not found');
    try {
      const body = await fs.readFile(file);
      res
        .setHeader('Content-Type', CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream')
        .setHeader('Cache-Control', 'private, max-age=300')
        .send(body);
    } catch {
      res.status(404).send('Not found');
    }
  }
}
