import {Injectable} from '@nestjs/common';
import {Problem} from '../../core/domain';
import {StorageService} from '../../core/storage';
import type {Actor} from '../auth/session';
import {ApplicationsService} from '../applications/applications.service';
import {DocumentsRepository} from '../documents/documents.repository';
import {OcrWorkerService} from '../ocr/ocr-worker.service';
import {computeFapDiffs, recheckFapDiffs, type RuleLookup} from './fap-diff';
import {FapOcrRepository, FINAL_COMPARISON} from './fap-ocr.repository';

/**
 * Compares the signed FAP document (OCR) with the application data.
 *
 * The OCR runs when a FAP file is uploaded or on request ("Run comparison"). Only the fields that differ are stored
 * (crm_fap_document_ocr_discrepancies, system value + document value); the document side of the comparison is the
 * application data with those document values. While the review is open, a stored difference drops out as soon as
 * the application value equals the document value.
 */
@Injectable()
export class FapComparisonService {
  /** OCR runs in progress, per FAP file (a second request waits for the same run). */
  private readonly running = new Map<string, Promise<any>>();

  constructor(
    private readonly applications: ApplicationsService,
    private readonly documents: DocumentsRepository,
    private readonly ocr: FapOcrRepository,
    private readonly worker: OcrWorkerService,
    private readonly storage: StorageService,
  ) {}

  /** The application with the names printed on the signed FAP instead of ids / codes (province, city, PIC position). */
  private async withPrintedNames(app: any) {
    const pic = app.pic || {};
    const names = await this.ocr.printedNames([app.province, app.city, pic.province, pic.city, pic.position]);
    const name = (v: any) => names.get(v) ?? v;
    return {
      ...app,
      province: name(app.province),
      city: name(app.city),
      pic: {...pic, province: name(pic.province), city: name(pic.city), position: name(pic.position)},
    };
  }

  /** Finds the master rule of a field (label and section); `anchor` names a field of the wanted section when a key repeats. */
  private async ruleLookup(): Promise<RuleLookup> {
    const rules = await this.ocr.fieldRules();
    return (key, anchor) => {
      const found = rules.get(key) || [];
      const section = anchor ? rules.get(anchor)?.[0]?.section : undefined;
      return found.find(r => r.section === section) || found[0];
    };
  }

  /** The FAP file a request is about: the one asked for (it must be a file of this application's FAP), else the current one. */
  private async fapFile(id: string, fileId?: string) {
    const {fap, file: current} = await this.documents.currentFapFile(id);
    const file = fileId ? fap?.files.find((f: any) => f.id === fileId) : current;
    return {file, current};
  }

  /** Runs the OCR of a FAP file (the current one unless `fileId` is given; once per file at a time) and stores the differences. */
  async run(id: string, actor?: Actor, fileId?: string) {
    const {file, current: currentFile} = await this.fapFile(id, fileId);
    if (!file) return null;
    const isCurrent = file.id === currentFile?.id;
    const key = `${id}:${file.id}`;
    const busy = this.running.get(key);
    if (busy) return busy;
    const task = (async () => {
      try {
        const result = await this.worker.run(
          this.storage.absolutePath(file.storagePath),
          'fap',
          120000,
        );
        // The review of this file was closed while the OCR ran (approved / dismissed): the decision stands.
        const current = await this.ocr.read(id, file.id);
        if (current && FINAL_COMPARISON.includes(current.status)) return {...current, isCurrent};
        const application = await this.withPrintedNames(await this.applications.detail(id, actor));
        const diffs = computeFapDiffs(application, result.data || {}, await this.ruleLookup()).map(d => ({...d, section: d.section || 'FAP'}));
        await this.ocr.saveResult(id, file.id, diffs, actor?.username || null);
        return {...(await this.ocr.read(id, file.id)), isCurrent};
      } catch (err) {
        console.warn('FAP OCR comparison error:', err);
        return null;
      }
    })();
    this.running.set(key, task);
    return task.finally(() => this.running.delete(key));
  }

  /**
   * The comparison of a FAP file for the Documents tab (the current file unless `fileId` is given): `processing` while the OCR
   * runs, null when the file was never compared. `isCurrent` is false for an earlier file: its comparison is history, read only.
   * While the review of the current file is open the stored differences are checked against the current data.
   */
  async get(id: string, actor?: Actor, fileId?: string) {
    const {file, current: currentFile} = await this.fapFile(id, fileId);
    if (!file) return null;
    const isCurrent = file.id === currentFile?.id;
    const stored = await this.ocr.read(id, file.id);
    if (this.running.has(`${id}:${file.id}`))
      return {...(stored || {isFap: true, hasDifferences: false, diffs: [], notedDiffs: []}), status: 'processing', isCurrent};
    if (!stored) return null;
    if (!isCurrent || FINAL_COMPARISON.includes(stored.status)) return {...stored, isCurrent};
    const detail: any = await this.applications.detail(id, actor);
    const remaining = recheckFapDiffs(await this.withPrintedNames(detail), stored.diffs);
    const changed =
      remaining.length !== stored.diffs.length || remaining.some((d, i) => d.oldValue !== stored.diffs[i].oldValue);
    let latest = stored;
    if (changed) {
      await this.ocr.saveResult(id, stored.fileId, remaining, actor?.username || null, false);
      latest = (await this.ocr.read(id, file.id)) || stored;
    }
    // Only the stored differences are re-checked; a field that matched at the scan and was changed since is not
    // seen until the OCR runs again, so the screen warns when the data is newer than the scan.
    return {...latest, isCurrent, needsRerun: new Date(detail.updatedAt).getTime() > new Date(latest.comparedAt).getTime()};
  }

  /** The review is closed or edited on the current file only: an earlier file is history. */
  private async currentFileOrRefuse(id: string) {
    const {file} = await this.documents.currentFapFile(id);
    if (!file) throw new Problem(404, 'Belum ada dokumen FAP yang diunggah.');
    return file;
  }

  async saveRemarks(id: string, remarks: string, actor: Actor) {
    const file = await this.currentFileOrRefuse(id);
    return this.ocr.saveRemarks(id, file.id, remarks, actor.username || null);
  }

  /** A FAP file was removed: its stored comparison goes with it. */
  forget(fileId: string) {
    return this.ocr.clear(fileId);
  }
}
