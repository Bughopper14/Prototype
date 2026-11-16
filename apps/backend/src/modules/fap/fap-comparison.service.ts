import {Injectable} from '@nestjs/common';
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
  /** OCR runs in progress, per application (a second request waits for the same run). */
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

  /** Runs the OCR of the current FAP file (once per application at a time) and stores the differences. */
  run(id: string, actor?: Actor) {
    const busy = this.running.get(id);
    if (busy) return busy;
    const task = (async () => {
      const {file} = await this.documents.currentFapFile(id);
      if (!file) return null;
      try {
        const result = await this.worker.run(
          await this.storage.locateNamedCopy(file.storagePath || file.fileName),
          'fap',
          120000,
        );
        // The review of this file was closed while the OCR ran (approved / dismissed): the decision stands.
        const current = await this.ocr.read(id);
        if (current && current.fileId === file.id && FINAL_COMPARISON.includes(current.status)) return current;
        const application = await this.withPrintedNames(await this.applications.detail(id, actor));
        const diffs = computeFapDiffs(application, result.data || {}, await this.ruleLookup()).map(d => ({...d, section: d.section || 'FAP'}));
        await this.ocr.saveResult(id, file.id, diffs, actor?.username || null);
        return this.ocr.read(id);
      } catch (err) {
        console.warn('FAP OCR comparison error:', err);
        return null;
      }
    })();
    this.running.set(id, task);
    return task.finally(() => this.running.delete(id));
  }

  /**
   * The comparison for the Documents tab: `processing` while the OCR runs, null when there is no FAP file or it was
   * never compared. While the review is open the stored differences are checked against the current data.
   */
  async get(id: string, actor?: Actor) {
    const {file} = await this.documents.currentFapFile(id);
    if (!file) return null;
    const stored = await this.ocr.read(id);
    if (this.running.has(id)) return {...(stored || {isFap: true, hasDifferences: false, diffs: []}), status: 'processing'};
    if (!stored || FINAL_COMPARISON.includes(stored.status)) return stored;
    const detail: any = await this.applications.detail(id, actor);
    const remaining = recheckFapDiffs(await this.withPrintedNames(detail), stored.diffs);
    const changed =
      remaining.length !== stored.diffs.length || remaining.some((d, i) => d.oldValue !== stored.diffs[i].oldValue);
    let current = stored;
    if (changed) {
      await this.ocr.saveResult(id, stored.fileId, remaining, actor?.username || null, false);
      current = (await this.ocr.read(id)) || stored;
    }
    // Only the stored differences are re-checked; a field that matched at the scan and was changed since is not
    // seen until the OCR runs again, so the screen warns when the data is newer than the scan.
    return {...current, needsRerun: new Date(detail.updatedAt).getTime() > new Date(current.comparedAt).getTime()};
  }

  saveRemarks(id: string, remarks: string, actor: Actor) {
    return this.ocr.saveRemarks(id, remarks, actor.username || null);
  }

  /** The FAP document is accepted: the review closes and the first stage is submitted (locked). */
  async approve(id: string, actor: Actor, remarks?: string) {
    await this.ocr.close(id, 'APPROVED', remarks, actor.username || null);
    await this.applications.submitFirstStage(id, actor, remarks);
  }

  /** The differences are noted (the data is corrected in the form); the review closes. */
  dismiss(id: string, actor: Actor, remarks?: string) {
    return this.ocr.close(id, 'DISMISSED', remarks, actor.username || null);
  }

  /** The FAP file was removed: the stored comparison goes with it. */
  forget(id: string) {
    return this.ocr.clear(id);
  }
}
