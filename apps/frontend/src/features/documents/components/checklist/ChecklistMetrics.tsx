/** The five metric cards above the checklist. */
import {CheckCircle2, Clock, ShieldCheck, Layers, Sparkles} from 'lucide-react';

export function ChecklistMetrics({
  stats,
}: {
  stats: ReturnType<typeof import('@/features/documents/lib/checklist/summarize').summarizeRows>;
}) {
  return (
    <div className="doc-checklist-bento-grid">
      <div className="doc-checklist-bento-card card-total">
        <div className="bento-top">
          <span className="bento-lbl">Total Dokumen Persyaratan</span>
          <div className="bento-icon">
            <Layers size={18} />
          </div>
        </div>
        <div className="bento-val">{stats.totalCount}</div>
        <small className="bento-sub">Standar Matriks Legal &amp; Kredit</small>
      </div>

      <div className="doc-checklist-bento-card card-available">
        <div className="bento-top">
          <span className="bento-lbl">Sudah Ada / Terpenuhi</span>
          <div className="bento-icon green">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="bento-val text-green">
          {stats.availableCount} <span className="bento-total-ratio">/ {stats.totalCount}</span>
        </div>
        <small className="bento-sub text-green">
          {Math.round((stats.availableCount / (stats.totalCount || 1)) * 100)}% Kelengkapan
        </small>
      </div>

      <div className="doc-checklist-bento-card card-pending">
        <div className="bento-top">
          <span className="bento-lbl">Belum Ada / Pending</span>
          <div className="bento-icon amber">
            <Clock size={18} />
          </div>
        </div>
        <div className="bento-val text-amber">{stats.pendingCount}</div>
        <small className="bento-sub text-amber">Perlu tindak lanjut / upload</small>
      </div>

      <div className="doc-checklist-bento-card card-mandatory">
        <div className="bento-top">
          <span className="bento-lbl">Dokumen Wajib (Mandatory)</span>
          <div className="bento-icon blue">
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="bento-val text-blue">
          {stats.mandatoryAvailableCount} <span className="bento-total-ratio">/ {stats.mandatoryCount}</span>
        </div>
        <small className="bento-sub">
          {stats.mandatoryCount - stats.mandatoryAvailableCount === 0
            ? 'Semua dokumen wajib terpenuhi ✓'
            : `${stats.mandatoryCount - stats.mandatoryAvailableCount} wajib belum terpenuhi`}
        </small>
      </div>

      <div className="doc-checklist-bento-card card-system">
        <div className="bento-top">
          <span className="bento-lbl">Terhubung Sistem (Auto-Link)</span>
          <div className="bento-icon purple">
            <Sparkles size={18} />
          </div>
        </div>
        <div className="bento-val text-purple">{stats.systemLinkedCount}</div>
        <small className="bento-sub">Dari FAP, Customer &amp; Legal</small>
      </div>
    </div>
  );
}
