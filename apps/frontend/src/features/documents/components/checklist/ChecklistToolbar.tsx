/** Search box and the department / status filters. */
import {Search, Filter, X} from 'lucide-react';
import type {StatusFilter} from '@/features/documents/lib/checklist/types';

export function ChecklistToolbar({
  searchTerm,
  setSearchTerm,
  selectedDept,
  setSelectedDept,
  selectedStatus,
  setSelectedStatus,
  stages,
  selectedStage,
  setSelectedStage,
  grouped,
  setGrouped,
  toolbarRef,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedDept: string;
  setSelectedDept: (v: string) => void;
  selectedStatus: StatusFilter;
  setSelectedStatus: (v: StatusFilter) => void;
  stages: {code: string; name: string}[];
  selectedStage: string;
  setSelectedStage: (v: string) => void;
  grouped: boolean;
  setGrouped: (v: boolean) => void;
  toolbarRef: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="doc-checklist-toolbar" ref={toolbarRef}>
      <div className="search doc-search-input">
        <Search size={16} />
        <input
          placeholder="Cari nama dokumen, kode (NIB, KTP, DEED), atau detail..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="doc-filters-group">
        <div className="doc-view-switch" role="group" aria-label="Tampilan daftar">
          <button type="button" className={grouped ? 'active' : ''} onClick={() => setGrouped(true)}>
            Per Tahap
          </button>
          <button type="button" className={!grouped ? 'active' : ''} onClick={() => setGrouped(false)}>
            Daftar
          </button>
        </div>

        <div className="filter-select-wrap">
          <Filter size={14} className="filter-icon" />
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="doc-filter-select"
          >
            <option value="ALL">Semua Departemen</option>
            <option value="MKT">MKT (Marketing)</option>
            <option value="BS">BS (Branch Support)</option>
            <option value="CA">CA (Credit Analyst)</option>
            <option value="LEGAL">LEGAL (Legal Officer)</option>
            <option value="COMMITTEE">COMMITTEE (Komite)</option>
          </select>
        </div>

        <div className="filter-select-wrap">
          <select
            value={selectedStage}
            onChange={e => setSelectedStage(e.target.value)}
            className="doc-filter-select"
          >
            <option value="ALL">Semua Tahap</option>
            {stages.map(s => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-select-wrap">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as StatusFilter)}
            className="doc-filter-select"
          >
            <option value="ALL">Semua Status</option>
            <option value="AVAILABLE">✓ Sudah Ada</option>
            <option value="PENDING">⏳ Belum Ada / Pending</option>
          </select>
        </div>
      </div>
    </div>
  );
}
