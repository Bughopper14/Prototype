import {date, money, statusLabel} from '@/shared/lib/format';
import {Badge} from '@/shared/ui/Badge';
import {label} from '@liugong/shared';
import {ArrowUpRight, Building2, ChevronLeft, ChevronRight, Download, Search, Settings2} from 'lucide-react';
import {useEffect, useState} from 'react';

export function ApplicationTable({
  rows,
  open,
  compact = false,
  documentMode = false,
  onViewAll,
}: {
  rows: any[];
  open: (id: string) => void;
  compact?: boolean;
  documentMode?: boolean;
  onViewAll?: () => void;
}) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('ALL'),
    [branch, setBranch] = useState('ALL'),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [page, setPage] = useState(0),
    [dates, setDates] = useState(false);
  const filtered = rows.filter(
    r =>
      (r.company_name + ' ' + r.fap_number).toLowerCase().includes(search.toLowerCase()) &&
      (status === 'ALL' || r.status === status) &&
      (branch === 'ALL' || r.branch_code === branch) &&
      (!start || String(r.application_date).slice(0, 10) >= start) &&
      (!end || String(r.application_date).slice(0, 10) <= end),
  );
  useEffect(() => setPage(0), [search, status, branch, start, end]);
  const count = compact ? 5 : 8;
  const visible = filtered.slice(page * count, (page + 1) * count);
  function exportCsv() {
    const lines = [
      ['FAP', 'Customer', 'Branch', 'Status', 'Financing IDR', 'Date'],
      ...filtered.map(r => [
        r.fap_number,
        r.company_name,
        r.branch_code,
        statusLabel[r.status],
        r.financing_value || 0,
        String(r.application_date).slice(0, 10),
      ]),
    ];
    const csv = lines
      .map(r =>
        r
          .map(
            v =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "' $&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'liugong-applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="panel applications-panel">
      <div className="panel-head">
        <h2>
          {compact
            ? 'Recent applications'
            : documentMode
              ? 'Document verification queue'
              : 'All applications'}{' '}
          <span>{rows.length}</span>
        </h2>
        {compact ? (
          <button className="text-link" onClick={onViewAll}>
            View all applications <ArrowUpRight size={16} />
          </button>
        ) : (
          <button className="button small" onClick={exportCsv}>
            <Download size={15} />
            Export
          </button>
        )}
      </div>
      <div className="table-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search applications"
            placeholder="Search company or FAP number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filters">
          <select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            {Object.entries(statusLabel).map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="Filter branch" value={branch} onChange={e => setBranch(e.target.value)}>
            <option value="ALL">All branches</option>
            {[...new Set(rows.map(r => r.branch_code))].sort().map(b => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <button className={'button small ' + (dates ? 'selected' : '')} onClick={() => setDates(!dates)}>
            <Settings2 size={15} />
            <span>Dates</span>
          </button>
        </div>
      </div>
      {dates && (
        <div className="date-filter">
          <label>
            From <input type="date" value={start} onChange={e => setStart(e.target.value)} />
          </label>
          <label>
            To <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </label>
          <button
            className="text-link"
            onClick={() => {
              setStart('');
              setEnd('');
            }}
          >
            Clear dates
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>COMPANY / APPLICATION</th>
              <th>BRANCH</th>
              <th>FINANCING AMOUNT</th>
              <th>STATUS</th>
              <th>DOCUMENTS</th>
              <th>APPLICATION DATE</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => open(r.id)}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter') open(r.id);
                }}
              >
                <td>
                  <div className="company-cell">
                    <span className={'company-icon tint-' + (i % 3)}>
                      <Building2 size={18} />
                    </span>
                    <div>
                      <b>{r.company_name}</b>
                      <small>
                        {r.fap_number} <span>· {label(r.company_type)}</span>
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="branch">{r.branch_code}</span>
                </td>
                <td>
                  <b className="amount">{money(r.financing_value)}</b>
                  <small>{r.tenor_months ? r.tenor_months + ' months' : 'Proposal pending'}</small>
                </td>
                <td>
                  <Badge status={r.status} />
                </td>
                <td>
                  <div className="doc-progress">
                    <span>
                      <i style={{width: (r.verified_docs / Math.max(1, r.total_docs)) * 100 + '%'}} />
                    </span>
                    <small>
                      {r.verified_docs}/{r.total_docs}
                    </small>
                  </div>
                </td>
                <td className="date-cell">{date(r.application_date)}</td>
                <td>
                  <ChevronRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            <Search size={26} />
            <h3>No applications found</h3>
            <p>Try a different search or filter.</p>
          </div>
        )}
      </div>
      <div className="table-foot">
        <span>
          Showing {filtered.length ? page * count + 1 : 0}–{Math.min((page + 1) * count, filtered.length)} of{' '}
          {filtered.length} applications
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="page-number">{page + 1}</span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={(page + 1) * count >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
