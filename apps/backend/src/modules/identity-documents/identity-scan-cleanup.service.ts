import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {StorageService} from '../../core/storage';
import {IdentityDocumentsRepository} from './identity-documents.repository';

/** A scan is kept this long for the form that is still being filled; after that only a stored stakeholder keeps it. */
const KEEP_MS = 24 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Scans (KTP, NPWP, passport, KITAS, NIB) are written to documents/<type>/ as soon as they are uploaded for OCR, but a
 * database row only exists once the stakeholder is saved. A scan that nobody saved would stay on disk for ever, so
 * this removes the ones older than a day that no row refers to. It runs at start-up and every few hours.
 */
@Injectable()
export class IdentityScanCleanup implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(IdentityScanCleanup.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly storage: StorageService,
    private readonly identities: IdentityDocumentsRepository,
  ) {}

  onModuleInit() {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Removes the unreferenced scans older than a day; returns how many files were removed. */
  async sweep(now = Date.now()) {
    let removed = 0;
    try {
      const kept = await this.identities.referencedPaths();
      const dirs = (await fs.readdir(this.storage.documentsDir, {withFileTypes: true})).filter(e => e.isDirectory());
      for (const dir of dirs) {
        for (const name of await fs.readdir(path.join(this.storage.documentsDir, dir.name))) {
          const file = path.join(this.storage.documentsDir, dir.name, name);
          const info = await fs.stat(file);
          if (!info.isFile() || now - info.mtimeMs < KEEP_MS || kept.has(`${dir.name}/${name}`.toLowerCase())) continue;
          await fs.unlink(file);
          removed++;
        }
      }
    } catch (err) {
      this.log.warn(`Scan cleanup skipped: ${(err as Error).message}`);
    }
    if (removed) this.log.log(`Removed ${removed} unsaved identity scan(s) older than a day`);
    return removed;
  }
}
