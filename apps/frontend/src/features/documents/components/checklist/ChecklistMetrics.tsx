/** The four metric cards above the checklist. */
import {CheckCircle2, Clock, ShieldCheck, Layers} from 'lucide-react';

const SHOWN = 3;

/** The first few missing documents, with "+N lainnya" for the rest (the full list is in the tooltip). */
function MissingList({items, mandatory}: {items: {name: string; mandatory: boolean}[]; mandatory?: boolean}) {
  if (!items.length) return null;
  const rest = items.length - SHOWN;
  return (
    <ul className="bento-missing" title={items.map(i => i.name).join('\n')}>
      {items.slice(0, SHOWN).map(i => (
        <li key={i.name}>
          {i.name}
          {!mandatory && <em className={i.mandatory ? 'tag-wajib' : 'tag-opsional'}>{i.mandatory ? 'wajib' : 'opsional'}</em>}
        </li>
      ))}
      {rest > 0 && <li className="bento-more">+{rest} lainnya</li>}
    </ul>
  );
}

function Progress({value}: {value: number}) {
  return (
    <div className="bento-progress" aria-hidden="true">
      <span style={{width: `${Math.min(100, Math.max(0, value))}%`}} />
    </div>
  );
}

export function ChecklistMetrics({
  stats,
}: {
  stats: ReturnType<typeof import('@/features/documents/lib/checklist/summarize').summarizeRows>;
}) {
  const availablePct = Math.round((stats.availableCount / (stats.totalCount || 1)) * 100);
  const mandatoryPct = Math.round((stats.mandatoryAvailableCount / (stats.mandatoryCount || 1)) * 100);
  const mandatoryLeft = stats.mandatoryCount - stats.mandatoryAvailableCount;
  const pending = [
    ...stats.missingMandatory.map((name: string) => ({name, mandatory: true})),
    ...stats.missingOptional.map((name: string) => ({name, mandatory: false})),
  ];

  return (
    <div className="doc-checklist-bento-grid">
      <div className="doc-checklist-bento-card card-total">
        <div className="bento-top">
          <span className="bento-lbl">Total Dokumen</span>
          <Layers size={16} className="bento-icon" />
        </div>
        <div className="bento-val">{stats.totalCount}</div>
        <small className="bento-sub">Standar matriks legal &amp; kredit</small>
      </div>

      <div className="doc-checklist-bento-card card-available">
        <div className="bento-top">
          <span className="bento-lbl">Sudah Ada</span>
          <CheckCircle2 size={16} className="bento-icon" />
        </div>
        <div className="bento-val">
          {stats.availableCount} <span className="bento-total-ratio">/ {stats.totalCount}</span>
        </div>
        <Progress value={availablePct} />
        <small className="bento-sub text-green">{availablePct}% kelengkapan</small>
      </div>

      <div className="doc-checklist-bento-card card-pending">
        <div className="bento-top">
          <span className="bento-lbl">Belum Ada</span>
          <Clock size={16} className="bento-icon" />
        </div>
        <div className="bento-val">{stats.pendingCount}</div>
        <small className="bento-sub">{stats.pendingCount > 0 ? 'Perlu diunggah atau ditindaklanjuti' : 'Semua dokumen sudah ada'}</small>
        <MissingList items={pending} />
      </div>

      <div className="doc-checklist-bento-card card-mandatory">
        <div className="bento-top">
          <span className="bento-lbl">Dokumen Wajib</span>
          <ShieldCheck size={16} className="bento-icon" />
        </div>
        <div className="bento-val">
          {stats.mandatoryAvailableCount} <span className="bento-total-ratio">/ {stats.mandatoryCount}</span>
        </div>
        <Progress value={mandatoryPct} />
        <small className={`bento-sub ${mandatoryLeft === 0 ? 'text-green' : 'text-amber'}`}>
          {mandatoryLeft === 0 ? 'Semua dokumen wajib terpenuhi' : `${mandatoryLeft} wajib belum terpenuhi`}
        </small>
        <MissingList items={stats.missingMandatory.map((name: string) => ({name, mandatory: true}))} mandatory />
      </div>
    </div>
  );
}
