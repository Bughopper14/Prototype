import {CustomerDetailView} from '@/features/customers/components/CustomerDetailView';
import {hasAuthority} from '@/shared/lib/auth';
import {date} from '@/shared/lib/format';
import {label} from '@liugong/shared';
import {Building2, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Search} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import * as XLSX from 'xlsx';
import './CustomerDirectory.css';

const customerNumber = (n?: number | null) => (n ? String(n).padStart(3, '0') : '');
const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  {value: 'created_desc', label: 'Newest customer'},
  {value: 'created_asc', label: 'Oldest customer'},
  {value: 'name_asc', label: 'Company A–Z'},
  {value: 'name_desc', label: 'Company Z–A'},
  {value: 'apps_desc', label: 'Most applications'},
  {value: 'latest_activity', label: 'Latest activity'},
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function appStatusMeta(app: any): {label: string; tone: string} {
  if (!app) return {label: 'No applications', tone: 'muted'};
  const raw = String(app.status || app.approvalStatus || '').toUpperCase();
  if (raw === 'APPROVED') return {label: 'Approved', tone: 'approved'};
  if (raw === 'REJECTED') return {label: 'Rejected', tone: 'rejected'};
  if (raw === 'SUBMITTED' || raw === 'IN_APPROVAL' || raw === 'WAITING_APPROVAL' || raw === 'IN_REVIEW') {
    return {label: 'Waiting for approval', tone: 'waiting'};
  }
  if (raw === 'NOT_STARTED' || raw === 'NEW') return {label: 'Not started', tone: 'muted'};
  return {label: 'In progress', tone: 'progress'};
}

export function CustomerDirectory({
  customers,
  rows,
  user,
  open,
  startNewApplication,
  notify,
}: {
  customers: any[];
  rows: any[];
  user: any;
  open: (id: string, tab?: number) => void;
  startNewApplication?: (customerId?: string) => void;
  notify: (msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortValue>('created_desc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const {customerKey} = useParams<{customerKey?: string}>();

  useEffect(() => {
    if (!sortOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sortOpen]);

  const enriched = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const c of customers) {
      const normName = String(c.companyName || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const key = normName || `id:${c.id}`;
      const arr = groups.get(key) || [];
      arr.push(c);
      groups.set(key, arr);
    }

    return [...groups.entries()].map(([groupKey, records]) => {
      const idSet = new Set(records.map(r => r.id));
      const custApps = rows
        .filter(r => idSet.has(r.business_partner_id))
        .sort((a, b) => {
          const tb = new Date(b.created_at || b.createdAt || b.application_date || 0).getTime();
          const ta = new Date(a.created_at || a.createdAt || a.application_date || 0).getTime();
          return tb - ta;
        });

      const latestApp = custApps[0] || null;
      const appDates = custApps
        .map(a => new Date(a.application_date || a.created_at || a.createdAt).getTime())
        .filter(t => !isNaN(t) && t > 0);
      const recordFirstAppDates = records
        .map(r => (r.firstApplicationDate ? new Date(r.firstApplicationDate).getTime() : 0))
        .filter(t => !isNaN(t) && t > 0);
      const allFirstCandidates = [...appDates, ...recordFirstAppDates];
      const firstAppTs = allFirstCandidates.length > 0 ? Math.min(...allFirstCandidates) : null;

      const createdCandidates = records
        .map(r => {
          const raw = r.createdAt || r.created_at;
          return raw ? new Date(raw).getTime() : 0;
        })
        .filter(t => !isNaN(t) && t > 0);
      const createdTs = createdCandidates.length > 0 ? Math.min(...createdCandidates) : (firstAppTs ?? 0);

      const primary =
        records.find(r => r.npwp && r.nib) ||
        records.find(r => r.nib || r.npwp) ||
        records[0];

      const companyName = records.map(r => r.companyName).find(Boolean) || '';
      const nib = records.map(r => r.nib).find(Boolean) || '';
      const npwp = records.map(r => r.npwp).find(Boolean) || '';
      const customerNo = records.map(r => r.customerNo).find(Boolean) || null;
      const rawType = records.map(r => r.companyType).find(Boolean) || '';
      const typeLabel = rawType ? label(rawType) : '';
      const branch =
        latestApp?.branchCode ||
        latestApp?.branch_code ||
        records.map(r => r.branchCode).find(Boolean) ||
        '—';

      const activityCandidates = [
        ...custApps.map(a => new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || a.application_date || 0).getTime()),
        ...records.map(r => new Date(r.updated_at || r.updatedAt || r.created_at || r.createdAt || 0).getTime()),
      ].filter(t => !isNaN(t) && t > 0);
      const latestActivityTs = activityCandidates.length > 0 ? Math.max(...activityCandidates) : createdTs;

      return {
        ...primary,
        groupKey,
        recordIds: [...idSet],
        primaryId: primary.id,
        companyName,
        nib,
        npwp,
        customerNo,
        typeLabel,
        custApps,
        latestApp,
        appCount: custApps.length,
        createdTs: isNaN(createdTs) ? 0 : createdTs,
        latestActivityTs: isNaN(latestActivityTs) ? 0 : latestActivityTs,
        firstAppTs: firstAppTs && !isNaN(firstAppTs) ? firstAppTs : null,
        branch,
      };
    });
  }, [customers, rows]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of enriched) {
      if (!c.typeLabel) continue;
      counts.set(c.typeLabel, (counts.get(c.typeLabel) || 0) + 1);
    }
    const fixedSegments = ['Corporate', 'Commercial', 'Micro', 'Makro'];
    return fixedSegments.map(seg => ({key: seg, count: counts.get(seg) || 0}));
  }, [enriched]);

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = enriched.filter(c => {
      if (typeFilter !== 'ALL') {
        const key = c.typeLabel || 'Other';
        if (key !== typeFilter) return false;
      }
      if (!term) return true;
      return (
        (c.companyName || '').toLowerCase().includes(term) ||
        customerNumber(c.customerNo).includes(term) ||
        (c.nib || '').toLowerCase().includes(term) ||
        (c.npwp || '').toLowerCase().includes(term)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'created_desc') return (b.createdTs || 0) - (a.createdTs || 0);
      if (sortBy === 'created_asc') return (a.createdTs || 0) - (b.createdTs || 0);
      if (sortBy === 'name_asc') return (a.companyName || '').localeCompare(b.companyName || '');
      if (sortBy === 'name_desc') return (b.companyName || '').localeCompare(a.companyName || '');
      if (sortBy === 'apps_desc') return b.appCount - a.appCount;
      if (sortBy === 'latest_activity') return (b.latestActivityTs || 0) - (a.latestActivityTs || 0);
      return 0;
    });

    return list;
  }, [enriched, search, typeFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = filteredAndSorted.slice(startIdx, startIdx + PAGE_SIZE);

  const handleExport = () => {
    const data = filteredAndSorted.map(c => ({
      Company: c.companyName || '',
      Type: c.typeLabel || '',
      'Customer No': customerNumber(c.customerNo) || '',
      NIB: c.nib || '',
      NPWP: c.npwp || '',
      Apps: c.appCount,
      'Latest Status': appStatusMeta(c.latestApp).label,
      'Latest Stage': c.latestApp?.stageName || c.latestApp?.stage || '',
      Branch: c.branch === '—' ? '' : c.branch,
      'Customer Since': c.createdTs ? date(c.createdTs) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers-${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify(`Exported ${filteredAndSorted.length} customers`);
  };

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Newest customer';
  const decodedKey = customerKey ? decodeURIComponent(customerKey) : null;
  const selectedCustomer = decodedKey
    ? enriched.find(
        c => c.primaryId === decodedKey || c.groupKey === decodedKey || (c.recordIds || []).includes(decodedKey),
      ) || null
    : null;

  if (selectedCustomer) {
    return (
      <CustomerDetailView
        customer={selectedCustomer}
        user={user}
        onBack={() => navigate('/crm-dashboard/customers')}
        onOpenApplication={open}
        onStartNewApplication={startNewApplication}
      />
    );
  }

  return (
    <div className="cust-page-wrap">
      <div className="cust-top-actions">
        <button type="button" className="cust-export-btn" onClick={handleExport}>
          <Download size={14} />
          <span>Export</span>
        </button>
      </div>

      <div className="cust-toolbar-outer">
        <div className="cust-type-pills" role="tablist" aria-label="Filter customer type">
          <button
            type="button"
            className={`cust-type-pill ${typeFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            <span>All</span>
            <span className="cust-type-count">{enriched.length}</span>
          </button>
          {typeCounts.map(t => (
            <button
              key={t.key}
              type="button"
              className={`cust-type-pill ${typeFilter === t.key ? 'is-active' : ''}`}
              onClick={() => setTypeFilter(t.key)}
            >
              <span>{t.key}</span>
              <span className="cust-type-count">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="cust-controls">
          <div className="cust-sort-wrap" ref={sortRef}>
            <button
              type="button"
              className={`cust-sort-btn ${sortOpen ? 'is-open' : ''}`}
              onClick={() => setSortOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              <span>Sort: {activeSortLabel}</span>
              <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <div className="cust-sort-menu" role="listbox">
                <div className="cust-sort-menu-head">SORT BY</div>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={sortBy === opt.value}
                    className={`cust-sort-option ${sortBy === opt.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="cust-search-wrap">
            <Search size={15} className="cust-search-icon" />
            <input
              className="cust-search-input"
              aria-label="Search customer"
              placeholder="Search company, NIB or NPWP"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <section className="cust-panel">

      <div className="cust-table-wrap">
        <table className="cust-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>NIB</th>
              <th>NPWP</th>
              <th>Apps</th>
              <th>Latest Application</th>
              <th>Branch</th>
              <th>Customer Since</th>
              <th style={{width: 32}} />
            </tr>
          </thead>
          <tbody>
            {pageItems.map(c => {
              const status = appStatusMeta(c.latestApp);
              const stageLabel = c.latestApp?.stageName || c.latestApp?.stage || '';
              const segLower = (c.typeLabel || '').toLowerCase();
              const segClass = segLower.includes('commercial')
                ? 'commercial'
                : segLower.includes('micro')
                  ? 'micro'
                  : '';

              return (
                <tr
                  key={c.groupKey}
                  className="cust-row"
                  onClick={() => navigate(`/crm-dashboard/customers/${encodeURIComponent(c.primaryId || c.groupKey)}`)}
                >
                  <td>
                    <div className="cust-company-cell">
                      <span className="cust-company-icon">
                        <Building2 size={16} />
                      </span>
                      <div>
                        <div className="cust-company-name">{c.companyName}</div>
                        {c.typeLabel && <span className={`cust-seg-badge ${segClass}`}>{c.typeLabel}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="cust-mono">{c.nib || '—'}</td>
                  <td className="cust-mono">{c.npwp || '—'}</td>
                  <td>
                    <strong>{c.appCount}</strong>
                  </td>
                  <td>
                    <div>
                      <span className={`cust-status-pill ${status.tone}`}>
                        <span className="cust-status-dot" />
                        {status.label}
                      </span>
                      <div className="cust-stage-sub">
                        {c.latestApp
                          ? stageLabel
                            ? `Stage: ${stageLabel}`
                            : 'Not submitted yet'
                          : 'No applications yet'}
                      </div>
                    </div>
                  </td>
                  <td>{c.branch}</td>
                  <td>{c.createdTs ? date(c.createdTs) : '—'}</td>
                  <td style={{textAlign: 'right', color: '#94a3b8'}}>
                    <ChevronRight size={16} />
                  </td>
                </tr>
              );
            })}
            {!pageItems.length && (
              <tr>
                <td colSpan={8} style={{textAlign: 'center', padding: '40px 16px', color: '#64748b'}}>
                  No customers found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length > 0 && (
        <div className="cust-footer">
          <span>
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredAndSorted.length)} of{' '}
            {filteredAndSorted.length}
          </span>
          <div className="cust-pager">
            <button
              type="button"
              className="cust-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({length: totalPages}, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                className={`cust-page-btn ${n === safePage ? 'is-active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="cust-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
    </div>
  );
}
